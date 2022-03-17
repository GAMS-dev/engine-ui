import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import axios from "axios";
import { Link } from "react-router-dom";

const InstancesActionsButtonGroup = props => {
    const { label, server, setRefresh } = props;

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRemoveInstance = async () => {
        setIsSubmitting(true);
        try {
            await axios.delete(`${server}/usage/instances`, {
                params: {
                    label: label
                }
            });
            setShowConfirmDialog(false);
            setRefresh(refreshCnt => ({
                refresh: refreshCnt + 1
            }));
        }
        catch (err) {
            setSubmissionErrorMsg(`Problems deleting instance. Error message: ${getResponseError(err)}`);
        }
        setIsSubmitting(false);
    }

    return (
        <>
            <Link to={`/instances/update/${label}`} className="btn btn-sm btn-outline-info">
                Update
            </Link>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setShowConfirmDialog(true)}>Delete</button>
            <Modal show={showConfirmDialog} onHide={() => setShowConfirmDialog(false)}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleRemoveInstance();
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
                        <p>Are you sure you want to remove the instance: <code>{label}</code>? This cannot be undone!</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Remove Instance
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
        </>
    );
};
export default InstancesActionsButtonGroup;
