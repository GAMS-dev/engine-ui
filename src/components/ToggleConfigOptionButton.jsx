import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import { AlertContext } from "./Alert";
import { ServerConfigContext } from "../ServerConfigContext";

const ToggleConfigOptionButton = ({ configKey }) => {
    const [, setAlertMsg] = useContext(AlertContext);
    const [serverConfig, updateServerConfig] = useContext(ServerConfigContext);

    const [showDialog, setShowDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const configOptions = {
        job_priorities_access: {
            title: 'job priorities',
            confirmRequired: true,
            confirmMessage: <>
                <p>Please note that enabling/disabling the job priorities feature should only be done when the system is idle, i.e. no jobs are being submitted and no jobs are currently running. Otherwise, jobs may end up in an undefined state.</p>
                <p>Is the system currently idle and would you like to proceed?</p>
            </>
        }
    }

    const handleCloseDialog = () => {
        setSubmissionErrorMsg("");
        setShowDialog(false);
    }
    const togglePatchConfig = async (confirmedViaDialog) => {
        if (confirmedViaDialog !== true && configOptions[configKey].confirmRequired === true) {
            setShowDialog(true);
            return
        }
        setSubmissionErrorMsg("");
        setIsSubmitting(true);
        const newServerConfig = {}
        newServerConfig[configKey] = serverConfig[configKey] === "ENABLED" ? "DISABLED" : "ENABLED";
        try {
            await updateServerConfig(newServerConfig)
            setShowDialog(false);
        } catch (err) {
            if (confirmedViaDialog) {
                setSubmissionErrorMsg(`Problems updating configuration. Error message: ${getResponseError(err)}`);
            } else {
                setAlertMsg(`Problems updating configuration. Error message: ${getResponseError(err)}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => togglePatchConfig(false)}>
                {serverConfig[configKey] === "ENABLED" ? "Disable" : "Enable"} {configOptions[configKey].title}
            </button>
            <Modal show={showDialog} onHide={handleCloseDialog}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        togglePatchConfig(true);
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
                        {configOptions[configKey]['confirmMessage']}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseDialog}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Confirm {serverConfig[configKey] === "ENABLED" ? "Disable" : "Enable"}
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
        </>
    );
};

export default ToggleConfigOptionButton;
