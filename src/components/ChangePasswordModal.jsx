import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import SubmitButton from "./SubmitButton";
import axios from "axios";

const ChangePasswordModal = props => {
    const { showDialog, setShowDialog, handleSuccess } = props;
    const [{ server, username }] = useContext(AuthContext);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

    const handleCloseDialog = () => {
        setShowDialog(false);
    }
    const updateNewPassword = e => {
        setNewPassword(e.target.value);
    }
    const updateNewPasswordConfirm = e => {
        setNewPasswordConfirm(e.target.value);
    }
    const handleChangePassword = () => {
        setIsSubmitting(true);
        if (newPassword !== newPasswordConfirm) {
            setIsSubmitting(false);
            setSubmissionErrorMsg("The passwords you entered do not match. Please try again.");
            return;
        }
        axios
            .put(
                `${server}/users/`,
                {
                    username: username,
                    password: newPassword
                }
            )
            .then(res => {
                if (res.status === 200) {
                    handleSuccess();
                } else {
                    setSubmissionErrorMsg("Oops. Something went wrong! Please try again later..");
                }
            })
            .catch(err => {
                setSubmissionErrorMsg(`Some error occurred while trying to change your password. Error message: ${err.response.data.messa}.`);
            });
        setIsSubmitting(false);
    }

    return (
        <Modal show={showDialog} onHide={handleCloseDialog}>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    handleChangePassword();
                    return false;
                }}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Change password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    <fieldset disabled={isSubmitting}>
                        <div className="form-group">
                            <label htmlFor="newPassword" className="sr-only">
                                New Password
                        </label>
                            <input
                                type="password"
                                className="form-control"
                                id="newPassword"
                                placeholder="New password"
                                value={newPassword}
                                onChange={updateNewPassword}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="newPasswordConfirm" className="sr-only">
                                Confirm Password
                        </label>
                            <input
                                type="password"
                                className="form-control"
                                id="newPasswordConfirm"
                                placeholder="Confirm Password"
                                value={newPasswordConfirm}
                                onChange={updateNewPasswordConfirm}
                                required
                            />
                        </div>
                    </fieldset>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDialog}>
                        Cancel
                </Button>
                    <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                        Change Password
                </SubmitButton>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default ChangePasswordModal;
