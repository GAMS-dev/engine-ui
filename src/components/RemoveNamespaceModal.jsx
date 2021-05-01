import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import axios from "axios";

const RemoveNamespaceModal = props => {
  const { showDialog, setShowDialog, handleSuccess, namespace } = props;
  const [{ server }] = useContext(AuthContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");

  const handleCloseDialog = () => {
    setShowDialog(false);
  }
  const handleRemoveNamespace = () => {
    setIsSubmitting(true);
    axios
      .delete(
        `${server}/namespaces/${namespace}`
      )
      .then(res => {
        setIsSubmitting(false);
        if (res.status === 200) {
          handleCloseDialog();
          handleSuccess();
        } else {
          setSubmissionErrorMsg("Oops. Something went wrong! Please try again later..");
        }
      })
      .catch(err => {
        setSubmissionErrorMsg(`Some error occurred while trying to add the namespace. Error message: ${getResponseError(err)}.`);
        setIsSubmitting(false);
      });
  }

  return (
    <Modal show={showDialog} onHide={handleCloseDialog}>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleRemoveNamespace();
          return false;
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Please Confirm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
            {submissionErrorMsg}
          </div>
          <p>Are you sure you want to remove the namespace: <code>{props.namespace}</code>?</p>
          <p>This will also remove all the models registered in this namespace as well as cancel all jobs currently running in this namespace!</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDialog}>
            Cancel
                </Button>
          <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
            Remove Namespace
                </SubmitButton>
        </Modal.Footer>
      </form>
    </Modal>
  );
};

export default RemoveNamespaceModal;
