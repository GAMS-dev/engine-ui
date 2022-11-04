import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import axios from "axios";
import { AlertContext } from "./Alert";

const RemoveAuthProviderModal = props => {
    const { showDialog, setShowDialog, providerId, setRefreshProviders } = props;
    const [{ server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");

    const handleRemoveAuthProvider = async () => {
        try {
            setIsSubmitting(true);
            await axios.delete(`${server}/auth/providers`, {
                params: {
                    name: providerId
                }
            });
            setAlertMsg(`Authentication provider: ${providerId} removed successfully!`);
            setRefreshProviders(curr => curr + 1);
        } catch (err) {
            setSubmissionErrorMsg(`Some error occurred while trying to remove the authentication provider: ${providerId}. Error message: ${getResponseError(err)}.`);
        } finally {
            setIsSubmitting(false);
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
                    <p>Unused invitations that use this identity provider are considered invalid.
                        Users using this identity provider can no longer sign in, and their identity provider must be updated before they can sign in again.
                        All JWT tokens signed by this identity provider are considered invalid.</p>
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
