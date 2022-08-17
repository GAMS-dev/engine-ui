import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import axios from "axios";

const RemoveAuthProviderModal = props => {
    const { showDialog, setShowDialog, providerId } = props;
    const [{ server }] = useContext(AuthContext);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");

    const handleRemoveAuthProvider = async () => {
        try {
            setIsSubmitting(true);
            setSubmissionErrorMsg('NOT IMPLEMENTED');
            setIsSubmitting(false);
        } catch (err) {
            setSubmissionErrorMsg(`Some error occurred while trying to remove the authentication provider. Error message: ${getResponseError(err)}.`);
        }
    }

    const handleCloseDialog = () => {
        setSubmissionErrorMsg("");
        setShowDialog(false);
    }

    return (
        <Modal show={showDialog} onHide={handleCloseDialog}>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    handleRemoveAuthProvider();
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
                    <p>Are you sure you want to remove the authentication provider: <code>{providerId}</code>?</p>
                    <p>This will also remove all users registered with this authentication provider and cancel all jobs currently running by these users!</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDialog}>
                        Cancel
                    </Button>
                    <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                        Remove Authentication Provider
                    </SubmitButton>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default RemoveAuthProviderModal;
