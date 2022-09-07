import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import axios from "axios";
import { Link } from "react-router-dom";
import { AlertContext } from "./Alert";
import { useEffect } from "react";

const InstancePoolsActionsButtonGroup = props => {
    const { label, server, setRefresh, isPool,
        poolSize, poolSizeCurrent, poolIsCanceling, instancePoolsEnabled } = props;
    const [, setAlertMsg] = useContext(AlertContext);

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showScalePoolDialog, setShowScalePoolDialog] = useState(false);
    const [newPoolSize, setNewPoolSize] = useState(poolSize);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setSubmissionErrorMsg("");
    }, [showConfirmDialog, showScalePoolDialog])

    const handleRemoveInstance = async () => {
        setIsSubmitting(true);
        setSubmissionErrorMsg("");
        try {
            await axios.delete(`${server}/usage/${isPool ? 'pools' : 'instances'}`, {
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
            let responseErrorMsg = getResponseError(err);
            if (isPool && err.response.status === 404) {
                responseErrorMsg = "You are not allowed to delete this instance pool.";
            }
            setSubmissionErrorMsg(`Problems deleting instance ${isPool ? 'pool' : ''}. Error message: ${responseErrorMsg}`);
        }
        setIsSubmitting(false);
    }
    const handleScalePool = async () => {
        setSubmissionErrorMsg("");
        setIsSubmitting(true);
        try {
            await axios.put(`${server}/usage/pools`, {
                label: label,
                size: newPoolSize
            });
            setAlertMsg('success:Instance Pool scaled successfully');
            setShowScalePoolDialog(false);
            setRefresh(refreshCnt => ({
                refresh: refreshCnt + 1
            }));
        }
        catch (err) {
            let responseErrorMsg = getResponseError(err);
            if (isPool && err.response.status === 404) {
                responseErrorMsg = "You are not allowed to scale this instance pool.";
            }
            setSubmissionErrorMsg(`Problems scaling instance pool. Error message: ${responseErrorMsg}`);
        }
        setIsSubmitting(false);
    }

    return (
        <>
            {isPool ?
                poolIsCanceling ?
                    <small className="mr-3">Shutting down...</small> :
                    poolSizeCurrent !== poolSize ?
                        <small className="mr-3">Scaling {poolSizeCurrent < poolSize ? 'up' : 'down'}...</small> :
                        instancePoolsEnabled ? <button className="btn btn-sm btn-outline-info" onClick={() => setShowScalePoolDialog(true)}>Change Size</button> : <></> :
                <Link to={`instances/update/${label}`} className="btn btn-sm btn-outline-info">
                    Update
                </Link>}
            {!isPool || !poolIsCanceling ?
                <button className="btn btn-sm btn-outline-danger" onClick={() => setShowConfirmDialog(true)}>Delete</button> :
                <></>}
            <Modal show={showScalePoolDialog} onHide={() => setShowScalePoolDialog(false)}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        handleScalePool();
                        return false;
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Upade Instance Pool Size</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor="newPoolSize">
                                    New Size
                                </label>
                                <input
                                    type="number"
                                    id="newPoolSize"
                                    className="form-control"
                                    min="0"
                                    value={newPoolSize}
                                    required
                                    onChange={e => setNewPoolSize(e.target.value)}
                                />
                            </div>
                        </fieldset>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowScalePoolDialog(false)}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Update
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
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
                        <p>Are you sure you want to remove the instance {isPool ? 'pool' : ''}: <code>{label}</code>? This cannot be undone!</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Remove Instance {isPool ? 'Pool' : ''}
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
        </>
    );
};
export default InstancePoolsActionsButtonGroup;
