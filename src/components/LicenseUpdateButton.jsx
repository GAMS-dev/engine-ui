import React, { useState, useContext, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import SubmitButton from "./SubmitButton";
import axios from "axios";
import { getResponseError } from "./util";


const EngineLicUpdateButton = props => {
    const [{ server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const [showDialog, setShowDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [engineLicense, setEngineLicense] = useState("");

    useEffect(() => {
        if (showDialog) {
            setIsSubmitting(true);
            setSubmissionErrorMsg("");
            axios.get(`${server}/licenses/engine`)
                .then(res => {
                    if (res.status !== 200) {
                        setIsSubmitting(false);
                        setSubmissionErrorMsg("An unexpected error occurred while fetching Engine license. Please try again later.");
                        return;
                    }
                    const liceMultiLine = [];
                    while (liceMultiLine.length * 52 < res.data.license.length) {
                        liceMultiLine.push(res.data.license.substring(liceMultiLine.length * 52,
                            liceMultiLine.length * 52 + 52));
                    }
                    setIsSubmitting(false);
                    setEngineLicense(liceMultiLine.join('\n'));
                })
                .catch(err => {
                    setIsSubmitting(false);
                    setSubmissionErrorMsg(`An error occurred while fetching Engine license. Error message: ${getResponseError(err)}.`);
                });
        }
    }, [server, showDialog])

    const updateLicense = async () => {
        setIsSubmitting(true);
        setSubmissionErrorMsg("");
        const licenseTrimmed = engineLicense.replace(/\s/g, '');
        if (licenseTrimmed === "") {
            setSubmissionErrorMsg("Cannot submit empty Engine license");
            setIsSubmitting(false);
            return;
        }
        const licenseUpdateForm = new FormData();
        licenseUpdateForm.append("license", licenseTrimmed);
        try {
            const res = await axios.put(`${server}/licenses/engine`, licenseUpdateForm);
            if (res.status !== 200) {
                setSubmissionErrorMsg("An unexpected error occurred while updating Engine license. Please try again later.");
                setIsSubmitting(false);
                return;
            }
        }
        catch (err) {
            setSubmissionErrorMsg(`An error occurred while updating Engine license. Error message: ${getResponseError(err)}.`);
            setIsSubmitting(false);
            return;
        }
        setIsSubmitting(false);
        setShowDialog(false);
        setAlertMsg("success:Engine license successfully updated!");
    }

    return (
        <>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowDialog(true)}>
                Update Engine license
            </button>
            <Modal show={showDialog} onHide={() => setShowDialog(false)}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        updateLicense();
                        return false;
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Update Engine license</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor="engineLicense">
                                    Engine license
                                </label>
                                <textarea
                                    id="engineLicense"
                                    rows="4"
                                    cols="52"
                                    className="form-control monospace no-resize"
                                    style={{ fontSize: "10pt" }}
                                    value={engineLicense}
                                    onChange={e => setEngineLicense(e.target.value)} >
                                </textarea>
                            </div>
                        </fieldset>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Update
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
        </>
    );
};

export default EngineLicUpdateButton;
