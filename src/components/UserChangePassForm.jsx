import React, { useState, useContext } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ShowHidePasswordInput from "./ShowHidePasswordInput";

const UserChangePassForm = () => {
    const [{ username, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { user } = useParams();

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [passwordUpdated, setPasswordUpdated] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

    const navigate = useNavigate();

    const handleChangePassword = () => {
        if (newPassword !== newPasswordConfirm) {
            setSubmissionErrorMsg("The passwords you entered do not match. Please try again.");
            return;
        }
        setIsSubmitting(true);
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
                        navigate("/logout")
                    } else {
                        setAlertMsg("success:Password successfully updated!");
                        setPasswordUpdated(true);
                    }
                } else {
                    setSubmissionErrorMsg("Oops. Something went wrong! Please try again later..");
                }
            })
            .catch(err => {
                if (err.response == null || err.response.status !== 400 ||
                    err.response.data.errors == null || !err.response.data.errors.hasOwnProperty('password')) {
                    setSubmissionErrorMsg(`Some error occurred while trying to changing the password. Error message: ${getResponseError(err)}.`);
                } else {
                    setSubmissionErrorMsg(err.response.data.errors.password);
                }
                setIsSubmitting(false);
            });
    }

    return (
        <>
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 className="h2">{username === user ? 'Change Password' : `Change Password of User: ${user}`}</h1>
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
                        <ShowHidePasswordInput
                            value={newPassword}
                            setValue={setNewPassword}
                            id="newPassword"
                            label="New password"
                            usePlaceholder={true}
                            required={true} />
                        <ShowHidePasswordInput
                            value={newPasswordConfirm}
                            setValue={setNewPasswordConfirm}
                            id="newPasswordConfirm"
                            label="Confirm password"
                            usePlaceholder={true}
                            required={true} />
                    </fieldset>
                    <div className="mt-3">
                        <SubmitButton isSubmitting={isSubmitting}>
                            Change Password
                        </SubmitButton>
                    </div>
                    {passwordUpdated && <Navigate to="/users" />}
                </form>
            </div>
        </>
    );
}

export default UserChangePassForm;
