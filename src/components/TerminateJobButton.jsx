import React, { useContext, useState } from "react";
import axios from "axios";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AlertContext } from "./Alert";
import { isActiveJob, getResponseError } from "./util";

const TerminateJobButton = props => {
    const { token, status, server, setRefresh } = props;

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const [, setAlertMsg] = useContext(AlertContext);

    function terminateJob(hardKill = false) {
        const deleteJob = async () => {
            try {
                await axios.delete(
                    token.startsWith("hc:") ? `${server}/hypercube/${encodeURIComponent(token.substring(3))}?hard_kill=${hardKill}` :
                        `${server}/jobs/${encodeURIComponent(token)}?hard_kill=${hardKill}`,
                    {})
            } catch (err) {
                setAlertMsg(`Problems terminating job. Error message: ${getResponseError(err)}`);
                return
            }
        }
        setRefresh(refreshCnt => ({
            refresh: refreshCnt + 1
        }))
        deleteJob()
    }

    return (
        <>
            {isActiveJob(status) &&
                <button className="btn btn-sm btn-outline-danger"
                    onClick={() => setShowConfirmDialog(true)}>
                    {status === -2 ? 'Hard Kill' : 'Cancel'} </button>}
            <Modal show={showConfirmDialog} onHide={() => setShowConfirmDialog(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Please Confirm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to cancel this job? This cannot be undone!
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                        No
                    </Button>
                    <Button variant="primary" onClick={() => {
                        setShowConfirmDialog(false);
                        terminateJob(status === -2);
                    }}>
                        Yes, cancel job
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};
export default TerminateJobButton;
