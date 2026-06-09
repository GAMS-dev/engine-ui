import { useState, useContext, useEffect } from 'react';
import Select from 'react-select';
import AuthContext from '../contexts/AuthContext';
import axios from 'axios';
import { getResponseError } from '../util/util';
import SubmitButton from './SubmitButton';
import { Button, Form, Alert, InputGroup } from 'react-bootstrap';
import { DateTimePicker } from '@mantine/dates';
import { Calendar } from 'react-feather';
import dayjs from 'dayjs';

const CreateAuthTokenForm = () => {
  const [{ server, isOAuthToken }] = useContext(AuthContext);

  const [authToken, setAuthToken] = useState('');
  const [expirationDate, setExpirationDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 7)),
  );
  const [availableScopes, setAvailableScopes] = useState([]);
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [readonlyToken, setReadonlyToken] = useState(false);
  const [copySuccessMsg, setCopySuccessMsg] = useState('');
  const [submissionErrorMsg, setSubmissionErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const maxSeconds = 16070400;
  const minSeconds = 60;

  useEffect(() => {
    const availableScopesTmp = [
      { value: 'CONFIGURATION', label: 'Engine configuration' },
      { value: 'NAMESPACES', label: 'Namespaces/Models/Groups' },
      { value: 'JOBS', label: 'Jobs' },
      { value: 'HYPERCUBE', label: 'Hypercube jobs' },
      { value: 'USERS', label: 'Users' },
      { value: 'CLEANUP', label: 'Cleanup' },
      { value: 'USAGE', label: 'Usage/Quotas/Instances' },
      { value: 'LICENSES', label: 'Licenses' },
    ];
    if (!isOAuthToken) {
      availableScopesTmp.push({ value: 'AUTH', label: 'Authentication' });
    }
    setAvailableScopes(availableScopesTmp);
  }, [isOAuthToken]);

  const createAuthToken = async () => {
    setIsSubmitting(true);
    setSubmissionErrorMsg('');
    setFormErrors({});
    try {
      const authTokenForm = new FormData();
      authTokenForm.append(
        'expires_in',
        Math.max(
          minSeconds,
          Math.min(
            maxSeconds,
            Math.round(
              (expirationDate.getTime() - new Date().getTime()) / 1000,
            ),
          ),
        ),
      );
      let scopeTmp = selectedScopes.map((scope) => scope.value).join(' ');
      if (readonlyToken) {
        if (selectedScopes.length === 0) {
          // have to manually add all scopes, else user will have no access
          scopeTmp = availableScopes.map((scope) => scope.value).join(' ');
        }
        scopeTmp += ' READONLY';
      }
      authTokenForm.append('scope', scopeTmp);
      const response = await axios.post(`${server}/auth/`, authTokenForm);
      setAuthToken(response.data['token']);
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
        setSubmissionErrorMsg('Problems creating authentication token.');
      } else {
        setSubmissionErrorMsg(
          `Problems creating authentication token. Error message: ${getResponseError(err)}`,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(authToken);
    setCopySuccessMsg('Copied!');
    setTimeout(() => setCopySuccessMsg(''), 2000);
  };

  return (
    <div className="container-fluid px-0">
      {authToken === '' ? (
        <div>
          <div className="pt-3 pb-2 mb-4 border-bottom">
            <h1 className="h3 mb-0">Create Authentication Token</h1>
          </div>

          {submissionErrorMsg && (
            <Alert variant="danger" className="py-2 text-center small">
              {submissionErrorMsg}
            </Alert>
          )}

          <Form
            onSubmit={(e) => {
              e.preventDefault();
              createAuthToken();
            }}
          >
            <fieldset disabled={isSubmitting}>
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold small text-muted text-uppercase mb-2">
                  Expiration Date
                </Form.Label>
                <div className={formErrors.expires_in ? 'is-invalid' : ''}>
                  <DateTimePicker
                    leftSection={<Calendar size={18} />}
                    leftSectionPointerEvents="none"
                    value={expirationDate}
                    minDate={
                      new Date(
                        new Date().setSeconds(
                          new Date().getSeconds() + minSeconds,
                        ),
                      )
                    }
                    maxDate={
                      new Date(
                        new Date().setSeconds(
                          new Date().getSeconds() + maxSeconds,
                        ),
                      )
                    }
                    onChange={(date) => setExpirationDate(dayjs(date).toDate())}
                    className="w-100"
                  />
                </div>
                {formErrors.expires_in && (
                  <div className="text-danger small mt-1">
                    {formErrors.expires_in}
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label
                  htmlFor="accessScopes"
                  className="fw-semibold small text-muted text-uppercase mb-2"
                >
                  Access Scopes
                </Form.Label>
                <Select
                  inputId="accessScopes"
                  placeholder="Full access"
                  value={selectedScopes}
                  isSearchable
                  isClearable
                  isMulti
                  closeMenuOnSelect={false}
                  blurInputOnSelect={false}
                  onChange={(selected) => setSelectedScopes(selected || [])}
                  options={availableScopes}
                />
                {formErrors.scope && (
                  <div className="text-danger small mt-1">
                    {formErrors.scope}
                  </div>
                )}
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Check
                  type="checkbox"
                  id="readonlyToken"
                  label="Readonly access"
                  className="fw-medium text-secondary"
                  checked={readonlyToken}
                  onChange={(e) => setReadonlyToken(e.target.checked)}
                />
              </Form.Group>
            </fieldset>

            <div className="d-grid mt-4">
              <SubmitButton isSubmitting={isSubmitting}>
                Create Authentication Token
              </SubmitButton>
            </div>
          </Form>
        </div>
      ) : (
        <div className="pt-4 text-center">
          <div className="p-4 bg-light rounded border text-start mb-4">
            <label className="fw-semibold small text-muted text-uppercase mb-2 d-block">
              Your generated authentication token:
            </label>

            <InputGroup className="mb-2">
              <Form.Control
                readOnly
                value={authToken}
                className="font-monospace bg-white text-dark small py-2"
                style={{ wordBreak: 'break-all' }}
              />
              {window.isSecureContext && (
                <Button
                  variant={copySuccessMsg ? 'success' : 'outline-secondary'}
                  onClick={handleCopy}
                >
                  {copySuccessMsg || 'Copy'}
                </Button>
              )}
            </InputGroup>
            <Form.Text className="text-muted d-block text-center mt-1">
              Make sure to copy this token now. You won&apos;t be able to see it
              again!
            </Form.Text>
          </div>

          <div className="d-grid gap-2 col-4 mx-auto">
            <Button
              variant="primary"
              onClick={() => {
                setCopySuccessMsg('');
                setAuthToken('');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAuthTokenForm;
