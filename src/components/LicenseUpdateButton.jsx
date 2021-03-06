import React, { useState, useContext, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import SubmitButton from "./SubmitButton";
import axios from "axios";
import { getResponseError } from "./util";


const LicUpdateButton = props => {
    const { type, setLicenseExpiration } = props;
    const [{ server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const settings = {}
    let path;
    let b64enc;
    if (type === "engine") {
        path = "engine";
        settings.title = "Update Engine license";
        settings.desc = "Engine license";
        settings.id = "engineLicense";
        settings.fontSize = "10pt";
        settings.buttonLabel = "Update Engine license";
        settings.successMsg = "Engine license successfully updated!";
        b64enc = false;
    } else {
        path = "system-wide";
        settings.title = "Update system-wide GAMS license";
        settings.desc = "System-wide GAMS license";
        settings.id = "systemLicense";
        settings.fontSize = "8pt";
        settings.buttonLabel = "Update GAMS license";
        settings.successMsg = "GAMS license successfully updated!";
        b64enc = true;
    }

    const [showDialog, setShowDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [engineLicense, setEngineLicense] = useState("");

    useEffect(() => {
        if (showDialog) {
            setIsSubmitting(true);
            setSubmissionErrorMsg("");
            axios.get(`${server}/licenses/${encodeURIComponent(path)}`)
                .then(res => {
                    if (res.status !== 200) {
                        setIsSubmitting(false);
                        setSubmissionErrorMsg("An unexpected error occurred while fetching license. Please try again later.");
                        return;
                    }
                    let licFormatted = "";
                    if (res.data.license) {
                        if (b64enc) {
                            licFormatted = res.data.license.trim();
                        } else {
                            const liceMultiLine = [];

                            while (liceMultiLine.length * 52 < res.data.license.length) {
                                liceMultiLine.push(res.data.license.substring(liceMultiLine.length * 52,
                                    liceMultiLine.length * 52 + 52));
                            }
                            licFormatted = liceMultiLine.join('\n')
                        }
                    }
                    setIsSubmitting(false);
                    setEngineLicense(licFormatted);
                })
                .catch(err => {
                    setIsSubmitting(false);
                    setSubmissionErrorMsg(`An error occurred while fetching license. Error message: ${getResponseError(err)}.`);
                });
        }
    }, [server, path, b64enc, showDialog])

    const refreshExpirationDate = async () => {
        if (type !== "engine") {
            return;
        }
        try {
            const res = await axios.get(`${server}/licenses/engine`);
            console.log(res.data.expiration_date)
            setLicenseExpiration(res.data.expiration_date);
        }
        catch (err) {
            console.error(getResponseError(err));
        }
    }

    const updateLicense = async () => {
        setIsSubmitting(true);
        setSubmissionErrorMsg("");
        const licenseUpdateForm = new FormData();
        if (b64enc) {
            const licenseB64 = btoa(engineLicense.trim());
            if (licenseB64 === "") {
                setSubmissionErrorMsg("Cannot submit empty GAMS license");
                setIsSubmitting(false);
                return;
            }
            licenseUpdateForm.append("license", licenseB64);
        } else {
            const licenseTrimmed = engineLicense.replace(/\r?\n|\r/g, '');
            if (licenseTrimmed === "") {
                setSubmissionErrorMsg("Cannot submit empty Engine license");
                setIsSubmitting(false);
                return;
            }
            licenseUpdateForm.append("license", licenseTrimmed);
        }
        try {
            const res = await axios.put(`${server}/licenses/${encodeURIComponent(path)}`, licenseUpdateForm);
            if (res.status !== 200) {
                setSubmissionErrorMsg("An unexpected error occurred while updating license. Please try again later.");
                setIsSubmitting(false);
                return;
            }
            if (type === "engine") {
                refreshExpirationDate();
            }
        }
        catch (err) {
            setSubmissionErrorMsg(`An error occurred while updating license. Error message: ${getResponseError(err)}.`);
            setIsSubmitting(false);
            return;
        }
        setIsSubmitting(false);
        setShowDialog(false);
        setAlertMsg(`success:${settings.successMsg}`);
    }
    return (
        <>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowDialog(true)}>
                {settings.buttonLabel}
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
                        <Modal.Title>{settings.title}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor={settings.id}>
                                    {settings.desc}
                                </label>
                                <textarea
                                    id={settings.id}
                                    rows={6}
                                    cols={52}
                                    className="form-control monospace no-resize monospace"
                                    style={{ fontSize: settings.fontSize }}
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

export default LicUpdateButton;
