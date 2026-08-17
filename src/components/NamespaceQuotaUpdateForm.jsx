import { useState, useContext, useEffect, useRef } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext';
import axios from 'axios';
import { getResponseError } from '../util/util';
import SubmitButton from './SubmitButton';
import ClipLoader from './ThemedClipLoader';

const NamespaceQuotaUpdateForm = ({
  showDialog,
  setShowDialog,
  namespace,
  handleSuccess,
}) => {
  const [{ jwt, server }] = useContext(AuthContext);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [submissionErrorMsg, setSubmissionErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [quota, setQuota] = useState('');
  const [diskUsed, setDiskUsed] = useState('');
  const [validQuota, setValidQuota] = useState(true);

  const quotaInputRef = useRef(null);

  useEffect(() => {
    if (!showDialog) {
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSubmissionErrorMsg('');
    setQuota('');
    setDiskUsed('');
    setValidQuota(true);
    const fetchRequiredData = async () => {
      try {
        const res = await axios.get(
          `${server}/namespaces/${encodeURIComponent(namespace)}/disk-quota`,
        );
        if (res.data.disk_quota) {
          setQuota(res.data.disk_quota / 1e6);
        }
        if (res.data.disk_use) {
          setDiskUsed(res.data.disk_use / 1e6);
        }
      } catch (err) {
        setErrorMsg(
          `An error occurred while retrieving namespace quota. Error message: ${getResponseError(err)}.`,
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequiredData();
  }, [server, jwt, namespace, showDialog]);

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const handleUpdateQuotaSubmission = async () => {
    if (!validQuota) {
      return;
    }
    setIsSubmitting(true);

    try {
      if (quota) {
        await axios.put(
          `${server}/namespaces/${encodeURIComponent(namespace)}/disk-quota`,
          null,
          {
            params: {
              disk_quota: quota * 1e6,
            },
          },
        );
      } else {
        await axios.delete(
          `${server}/namespaces/${encodeURIComponent(namespace)}/disk-quota`,
        );
      }
      setIsSubmitting(false);
      handleCloseDialog();
      handleSuccess();
    } catch (err) {
      setIsSubmitting(false);
      setSubmissionErrorMsg(
        `An error occurred while updating namespace quota. Error message: ${getResponseError(err)}.`,
      );
    }
  };

  return (
    <Modal
      show={showDialog}
      onHide={handleCloseDialog}
      onEntered={() => quotaInputRef.current?.focus()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleUpdateQuotaSubmission();
          return false;
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Edit Disk Space Quota of Namespace: {namespace}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoading ? (
            <ClipLoader />
          ) : errorMsg ? (
            <div
              className="invalid-feedback text-center"
              style={{ display: 'block' }}
            >
              {errorMsg}
            </div>
          ) : (
            <>
              {diskUsed && (
                <Alert variant="info">
                  Disk Space used: {Math.round(diskUsed * 100) / 100} MB
                </Alert>
              )}
              <div
                className="invalid-feedback text-center"
                style={{
                  display: submissionErrorMsg !== '' ? 'block' : 'none',
                }}
              >
                {submissionErrorMsg}
              </div>
              <fieldset disabled={isSubmitting}>
                <div className="mb-3">
                  <label htmlFor="quotaDisk">Disk Space Quota (in MB)</label>
                  <input
                    ref={quotaInputRef}
                    type="number"
                    className={`form-control${validQuota ? '' : ' is-invalid'}`}
                    id="quotaDisk"
                    value={quota}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setValidQuota(true);
                        setQuota('');
                        return;
                      }
                      const val = parseInt(e.target.value);
                      if (isNaN(val) || !isFinite(val)) {
                        setValidQuota(false);
                        setQuota(e.target.value);
                        return;
                      }
                      setValidQuota(true);
                      setQuota(val);
                    }}
                  />
                </div>
              </fieldset>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <SubmitButton
            isSubmitting={isSubmitting}
            className="btn-primary"
            isDisabled={isLoading || !!errorMsg}
          >
            Update Quota
          </SubmitButton>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default NamespaceQuotaUpdateForm;
