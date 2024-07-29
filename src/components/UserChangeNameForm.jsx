import React, { useState, useContext } from "react";
import { Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";

const UserChangeNameForm = () => {
    const [{ username, server, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { user } = useParams();

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [usernameUpdated, setUsernameUpdated] = useState(false);

    const [newUsername, setNewUsername] = useState("");

    const navigate = useNavigate();

    const handleChangeUsername = async () => {
        setIsSubmitting(true);
        let uReq
        try {
            uReq = await axios.put(
                `${server}/users/username`,
                {
                    username: user,
                    new_username: newUsername
                })
        } catch (err) {
            if (err.response == null || err.response.status !== 400 ||
                err.response.data.errors == null || !err.response.data.errors.hasOwnProperty('new_username')) {
                setSubmissionErrorMsg(`Some error occurred while trying to change the name of the user: ${user}. Error message: ${getResponseError(err)}.`);
            } else {
                setSubmissionErrorMsg(err.response.data.errors.new_username);
            }
            setIsSubmitting(false);
            return
        }
        setIsSubmitting(false);
        if (uReq.status === 200) {
            if (user === username) {
                navigate("/logout")
            } else {
                setAlertMsg("success:Username successfully updated!");
                setUsernameUpdated(true);
            }
        } else {
            setSubmissionErrorMsg("Oops. Something went wrong! Please try again later..");
        }
    }

    return (
        <>
            {user === 'admin' || !roles.includes('admin') ?
                <div className="alert alert-danger">
                    <p><strong>You have no permission to change the username of user: {user}.</strong></p>
                </div> :
                <div>
                    <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                        <h1 className="h2">{`Change Username of User: ${user}`}</h1>
                    </div>
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleChangeUsername();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="mb-3">
                                <label htmlFor="modelName" className="visually-hidden">
                                    New Username
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="newUsername"
                                    placeholder="New Username"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Change Username
                            </SubmitButton>
                        </div>
                        {usernameUpdated && <Navigate to="/users" />}
                    </form>
                </div>}
        </>
    );
}

export default UserChangeNameForm;
