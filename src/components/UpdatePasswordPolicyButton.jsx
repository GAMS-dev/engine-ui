import React, { useState, useContext, useEffect, useRef } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import SubmitButton from "./SubmitButton";
import axios from "axios";
import { getResponseError } from "./util";


const UpdatePasswordPolicyButton = () => {

    const [{ server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const [showDialog, setShowDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [minPasswordLength, setMinPasswordLength] = useState(10);
    const [includeUppercase, setIncludeUppercase] = useState(false);
    const [includeLowercase, setIncludeLowercase] = useState(false);
    const [includeNumber, setIncludeNumber] = useState(false);
    const [includeSpecialChar, setIncludeSpecialChar] = useState(false);
    const [notInPopular, setNotInPopular] = useState(false);

    // get the current password policy to display it in the dialog
    useEffect(() => {
        if (!showDialog) {
            return
        }
        const fetchCurrentPolicy = async () => {
            setSubmissionErrorMsg('')
            try {
                await axios.get(`${server}/auth/password-policy`).then(resp => {
                    setMinPasswordLength(resp.data.min_password_length)
                    setIncludeUppercase(resp.data.must_include_uppercase )
                    setIncludeLowercase(resp.data.must_include_lowercase)
                    setIncludeNumber(resp.data.must_include_number)
                    setIncludeSpecialChar(resp.data.must_include_special_char)
                    setNotInPopular(resp.data.not_in_popular_passwords)
                });
            } catch (err) {
                setSubmissionErrorMsg(`Problems retrieving password policy. Error message: ${getResponseError(err)}.`);
                return;
            }
        }
        fetchCurrentPolicy()
    }, [server, showDialog])

    const updatePasswordPolicy = async () => {
        setSubmissionErrorMsg("")
        setIsSubmitting(true)

        try {
            await axios.put(`${server}/auth/password-policy`,
            {'min_password_length': minPasswordLength,
             'must_include_uppercase': includeUppercase,
             'must_include_lowercase': includeLowercase,
             'must_include_number': includeNumber,
             'must_include_special_char': includeSpecialChar,
             'not_in_popular_passwords': notInPopular})
             setShowDialog(false);
             setAlertMsg("success:Password policy updated successfully!");
        } catch (err) {
            setSubmissionErrorMsg(`Couldn't set new password policy. Error message: ${getResponseError(err)}.`);
            return;
        }  finally {
            setIsSubmitting(false)
        }
    }


    return (
        <>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowDialog(true)}>
                Update password policy
            </button>
            <Modal show={showDialog} onHide={() => setShowDialog(false)}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        updatePasswordPolicy();
                        return false;
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Update password policy</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-outline mt-3">
                                <label class="form-label" for="minPasswordLength">Minimum password length:</label>
                                <input
                                    required
                                    min="8"
                                    max="70"
                                    step="1"
                                    type="number"
                                    value={minPasswordLength}
                                    onChange={e => setMinPasswordLength(e.target.valueAsNumber)}
                                    id="minPasswordLength"
                                    className="form-control" />
                            </div>
                            <div className="form-check mt-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={includeUppercase}
                                    onChange={e => setIncludeUppercase(e.target.checked)}
                                    id="includeUppercase"
                                />
                                <label className="form-check-label" htmlFor="includeUppercase">Include at least one uppercase letter?</label>
                            </div>
                            <div className="form-check mt-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={includeLowercase}
                                    onChange={e => setIncludeLowercase(e.target.checked)}
                                    id="includeLowercase"
                                />
                                <label className="form-check-label" htmlFor="includeLowercase">Include at least one lowercase letter?</label>
                            </div>
                            <div className="form-check mt-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={includeNumber}
                                    onChange={e => setIncludeNumber(e.target.checked)}
                                    id="includeNumber"
                                />
                                <label className="form-check-label" htmlFor="includeNumber">Include at least one number?</label>
                            </div>
                            <div className="form-check mt-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={includeSpecialChar}
                                    onChange={e => setIncludeSpecialChar(e.target.checked)}
                                    id="includeSpecialChar"
                                />
                                <label className="form-check-label" htmlFor="includeSpecialChar">Include at least one special character?</label>
                            </div>
                            <div className="form-check mt-3">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={notInPopular}
                                    onChange={e => setNotInPopular(e.target.checked)}
                                    id="notInPopular"
                                />
                                <label className="form-check-label" htmlFor="notInPopular">Check if the password is commonly used?</label>
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

export default UpdatePasswordPolicyButton;
