import React, { useState, useContext } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import Select from 'react-select';
import axios from "axios";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import { useEffect } from "react";
import ShowHidePasswordInput from "./ShowHidePasswordInput";

const UserUpdateIdentityProviderForm = () => {
    const [{ server, username }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { userToEdit } = useParams();

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState("");

    const [providerUpdated, setProviderUpdated] = useState(false);

    const [availableIdentityProviders, setAvailableIdentityProviders] = useState([]);
    const [identityProvider, setIdentityProvider] = useState({ value: "gams_engine", label: "gams_engine" });
    const [identityProviderSubject, setIdentityProviderSubject] = useState("");
    const [enginePassword, setEnginePassword] = useState("");
    const [enginePasswordConfirm, setEnginePasswordConfirm] = useState("");

    const [showBlockConfirmDialog, setShowBlockConfirmDialog] = useState(false);

    useEffect(() => {
        const fetchAvailableProviders = async () => {
            try {
                const userInfoPromise = axios.get(`${server}/users/`, {
                    params: { username: userToEdit }
                });
                const response = await axios.get(`${server}/users/inviters-providers/${encodeURIComponent(username)}`);
                const availableIdentityProvidersTmp = response.data.map(provider => ({ value: provider.name, label: provider.name })).concat(
                    [{ value: "", label: "None (block user)" }]
                );
                const userInfoResponse = await userInfoPromise;
                const userInfo = userInfoResponse.data[0];
                setAvailableIdentityProviders(availableIdentityProvidersTmp);
                setIdentityProvider(userInfo.identity_provider == null ?
                    availableIdentityProvidersTmp[availableIdentityProvidersTmp.length - 1] :
                    availableIdentityProvidersTmp.filter(provider => provider.value === userInfo.identity_provider)[0]);
                setIdentityProviderSubject(userInfo.identity_provider_user_subject == null ? "" : userInfo.identity_provider_user_subject);
            } catch (err) {
                setSubmissionErrorMsg(`Problems while retrieving identity providers. Error message: ${getResponseError(err)}.`);
            }
        }
        fetchAvailableProviders();
    }, [server, userToEdit, username])

    const handleUpdateIdentityProvider = async (confirmBlock) => {
        setFormErrors("");
        if (identityProvider.value === "gams_engine" && enginePassword !== enginePasswordConfirm) {
            setSubmissionErrorMsg('Problems trying to update the identity provider.');
            setFormErrors({
                password_confirm: "The passwords you entered do not match"
            });
            return;
        }
        if (identityProvider.value === "" && confirmBlock === false) {
            setShowBlockConfirmDialog(true);
            return;
        }
        setIsSubmitting(true);
        try {
            const authProviderForm = new FormData();
            authProviderForm.append("username", userToEdit);
            authProviderForm.append("identity_provider_name", identityProvider.value);
            if (identityProvider.value === "gams_engine") {
                authProviderForm.append("password", enginePassword);
            } else if (identityProvider.value !== "") {
                authProviderForm.append("identity_provider_user_subject", identityProviderSubject);
            }
            await axios.put(`${server}/users/identity-provider`, authProviderForm);
            setAlertMsg("success:Identity provider successfully updated!");
            setProviderUpdated(true);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                setFormErrors(err.response.data.errors);
                setSubmissionErrorMsg('Problems trying to update the identity provider.');
            } else {
                setSubmissionErrorMsg(`Some error occurred while trying to update the identity provider. Error message: ${getResponseError(err)}.`);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div>
            {availableIdentityProviders.length > 0 ?
                <form
                    className="m-auto"
                    onSubmit={e => {
                        e.preventDefault();
                        handleUpdateIdentityProvider(false);
                        return false;
                    }}
                >
                    <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    <fieldset disabled={isSubmitting}>
                        {availableIdentityProviders.length > 1 && <div className="mb-3">
                            <label htmlFor="identityProvider">
                                Identity provider
                            </label>
                            <Select
                                inputId="identityProvider"
                                value={identityProvider}
                                isSearchable={true}
                                onChange={selected => setIdentityProvider(selected)}
                                options={availableIdentityProviders}
                            />
                        </div>}
                        {["", "gams_engine"].includes(identityProvider.value) ? <></> :
                            <div className="mb-3">
                                <label htmlFor="identityProviderSubject" className="visually-hidden">
                                    Identity provider subject
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="identityProviderSubject"
                                    placeholder="Identity provider subject"
                                    value={identityProviderSubject}
                                    onChange={e => setIdentityProviderSubject(e.target.value)}
                                    required
                                />
                            </div>}
                        {identityProvider.value === "gams_engine" ?
                            <>
                                <ShowHidePasswordInput
                                    value={enginePassword}
                                    setValue={setEnginePassword}
                                    id="newPasswordConfirm"
                                    label="New password"
                                    invalidFeedback={formErrors.password}
                                    usePlaceholder={true}
                                    required={true} />
                                <ShowHidePasswordInput
                                    value={enginePasswordConfirm}
                                    setValue={setEnginePasswordConfirm}
                                    id="enginePasswordConfirm"
                                    label="Confirm password"
                                    invalidFeedback={formErrors.password_confirm}
                                    usePlaceholder={true}
                                    required={true} />
                            </> : <></>}
                    </fieldset>
                    <div className="mt-3">
                        <SubmitButton isSubmitting={isSubmitting}>
                            Change Identity Provider
                        </SubmitButton>
                    </div>
                    <Modal show={showBlockConfirmDialog} onHide={() => setShowBlockConfirmDialog(false)}>
                        <Modal.Header closeButton>
                            <Modal.Title>Please Confirm</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            You are about to remove the identity provider from the user: <code>{userToEdit}</code>. This user will no longer be able to log in.
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowBlockConfirmDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={() => setShowBlockConfirmDialog(false)}>
                                Cancel
                            </Button>
                            <SubmitButton isSubmitting={isSubmitting} onClick={() => {
                                handleUpdateIdentityProvider(true);
                                setShowBlockConfirmDialog(false);
                            }} className="btn-primary">
                                Block User
                            </SubmitButton>
                        </Modal.Footer>
                    </Modal>
                    {providerUpdated && <Navigate to={`/users/${userToEdit}`} />}
                </form> : <div className="alert alert-danger">
                    There are no identity providers that you can assign.
                </div>}
        </div>
    );
}

export default UserUpdateIdentityProviderForm;
