import React, { useContext, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import axios from "axios";
import DownloadLink from "./DownloadLink";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";
import { Link } from "react-router-dom";

const ModelActionsButtonGroup = props => {
  const { id, namespace, server, setRefresh } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModelDialog, setShowDeleteModelDialog] = useState(false);

  const [, setAlertMsg] = useContext(AlertContext);

  function deleteModel() {
    setIsSubmitting(true);
    axios
      .delete(
        `${server}/namespaces/${encodeURIComponent(namespace.name)}/${encodeURIComponent(id)}`,
        {}
      )
      .then(res => {
        setIsSubmitting(false);
        setShowDeleteModelDialog(false);
        setRefresh(refreshCnt => ({
          refresh: refreshCnt + 1
        }));
      })
      .catch(err => {
        setIsSubmitting(false);
        setShowDeleteModelDialog(false);
        setAlertMsg(`Problems deleting model. Error message: ${getResponseError(err)}`);
      });
  }

  return (
    <>
      {namespace &&
        <div className="btn-group">
          {(namespace.permission & 4) === 4 &&
            <DownloadLink
              url={`${server}/namespaces/${encodeURIComponent(namespace.name)}/${encodeURIComponent(id)}`}
              filename={`${id}.zip`}
              className="btn btn-sm btn-outline-info">
              Download
                </DownloadLink>}
          {(namespace.permission & 2) === 2 &&
            <>
              <Link to={`/models/${namespace.name}/${id}`} className="btn btn-sm btn-outline-info">
                Update
              </Link>
              <button className="btn btn-sm btn-outline-danger" onClick={() => setShowDeleteModelDialog(true)}>Delete</button>
              <Modal show={showDeleteModelDialog} onHide={() => setShowDeleteModelDialog(false)}>
                <Modal.Header closeButton>
                  <Modal.Title>Please Confirm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  Are you sure you want to delete the model: '{id}' from the namespace: '{namespace.name}'? This cannot be undone!
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowDeleteModelDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={deleteModel} disabled={isSubmitting}>
                    Delete
                  </Button>
                </Modal.Footer>
              </Modal>
            </>}
        </div>
      }
    </>
  );
};
export default ModelActionsButtonGroup;
