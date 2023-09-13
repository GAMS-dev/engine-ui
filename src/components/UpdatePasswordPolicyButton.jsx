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
    const [includeCapital, setIncludeCapital] = useState(false);
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
            await axios.get(`${server}/auth/password-policy`).then(resp => {
                setMinPasswordLength(resp.data.min_password_length)
                setIncludeCapital(resp.data.must_include_capital)
                setIncludeLowercase(resp.data.must_include_lowercase)
                setIncludeNumber(resp.data.must_include_number)
                setIncludeSpecialChar(resp.data.must_include_special_char)
                setNotInPopular(resp.data.not_in_popular_passwords)
            });
        }
        fetchCurrentPolicy()
    }, [server, showDialog])

    const updatePasswordPolicy = async () => {
        setSubmissionErrorMsg("")
        setIsSubmitting(true)
        console.log(includeCapital)
        console.log(minPasswordLength)
        console.log(includeLowercase)
        console.log(includeNumber)
        console.log(includeSpecialChar)

        try {
            await axios.put(`${server}/auth/password-policy`, 
            {'min_password_length': minPasswordLength,
             'must_include_capital': includeCapital,
             'must_include_lowercase': includeLowercase,
             'must_include_number': includeNumber,
             'must_include_special_char': includeSpecialChar,
             'not_in_popular_passwords': notInPopular})
        } catch (err) {
            console.log(err)
            setSubmissionErrorMsg("")
        }  finally {
            setIsSubmitting(false)
            setShowDialog(false);
            setAlertMsg("success:Password policy updated successfully!");
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
                        <div className="form-outline  mt-3">
                            <label class="form-label" for="typeNumber">Minimum password length:</label>
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
                                checked={includeCapital}
                                onChange={e => setIncludeCapital(e.target.checked)}
                                id="includeCapital"
                                aria-describedby="includeCapitalHelp"
                            />
                            <label className="form-check-label" htmlFor="includeCapital">Include at least one capital letter?</label>
                        </div>
                        <div className="form-check mt-3">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={includeLowercase}
                                onChange={e => setIncludeLowercase(e.target.checked)}
                                id="includeLowercase"
                                aria-describedby="includeLowercaseHelp"
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
                                aria-describedby="includeNumberHelp"
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
                                aria-describedby="includeSpecialCharHelp"
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
                                aria-describedby="notInPopularHelp"
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
