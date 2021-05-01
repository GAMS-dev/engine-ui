import React, { useState, useContext } from "react";
import { Redirect, useParams, useHistory } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";

const UserChangePassForm = () => {
    const [{ username, server, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { user } = useParams();

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [passwordUpdated, setPasswordUpdated] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

    const history = useHistory();

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
                    username: user,
                    password: newPassword
                }
            )
            .then(res => {
                setIsSubmitting(false);
                if (res.status === 200) {
                    if (user === username) {
                        history.push("/logout")
                    } else {
                        setAlertMsg("success:Password successfully updated!");
                        setPasswordUpdated(true);
                    }
                } else {
                    setSubmissionErrorMsg("Oops. Something went wrong! Please try again later..");
                }
            })
            .catch(err => {
                setSubmissionErrorMsg(`Some error occurred while trying to change your password. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }

    return (
        <>
            {username !== user && !roles.includes('admin') ?
                <div className="alert alert-danger">
                    <p><strong>You have no permission to change password of user: {username}.</strong></p>
                </div> :
                <div>
                    <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                        <h1 className="h2">{username === user ? 'Change Password' : `Change Password of User: ${username}`}</h1>
                    </div>
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleChangePassword();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor="modelName" className="sr-only">
                                    New Password
                            </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="newPassword"
                                    placeholder="New password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="modelName" className="sr-only">
                                    Confirm Password
                            </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    id="newPasswordConfirm"
                                    placeholder="Confirm password"
                                    value={newPasswordConfirm}
                                    onChange={e => setNewPasswordConfirm(e.target.value)}
                                    required
                                />
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Change Password
                            </SubmitButton>
                        </div>
                        {passwordUpdated && <Redirect to="/users" />}
                    </form>
                </div>}
        </>
    );
}

export default UserChangePassForm;
