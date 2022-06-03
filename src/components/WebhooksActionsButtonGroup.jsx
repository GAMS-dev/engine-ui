import React, { useState, useContext } from "react";
import axios from "axios";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";

const WebhooksActionsButtonGroup = props => {
    const { id, url, events, server, setRefresh } = props;

    const [, setAlertMsg] = useContext(AlertContext);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRemoveWebhook = async () => {
        setIsSubmitting(true);
        try {
            await axios.delete(`${server}/users/webhooks`, {
                params: {
                    id: id
                }
            });
            setShowConfirmDialog(false);
            setRefresh(refreshCnt => ({
                refresh: refreshCnt + 1
            }));
        }
        catch (err) {
            setSubmissionErrorMsg(`Problems deleting webhook. Error message: ${getResponseError(err)}`);
        }
        setIsSubmitting(false);
    }

    return (
        <>
            {window.isSecureContext &&
                <button
                    type="button"
                    className="btn btn-sm btn-outline-info"
                    onClick={() => { navigator.clipboard.writeText(url); setAlertMsg("success:URL copied to clipboard!") }}>
                    Copy URL
                </button>}
            <button className="btn btn-sm btn-outline-danger" onClick={() => setShowConfirmDialog(true)}>Delete</button>
            <Modal show={showConfirmDialog} onHide={() => setShowConfirmDialog(false)}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleRemoveWebhook();
                        return false;
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Please confirm</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <p>Are you sure you want to remove the webhook (url: <code>{url}</code>) for the event(s): <code>{events}</code >? This cannot be undone!</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Remove Webhook
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
        </>
    );
};
export default WebhooksActionsButtonGroup;
