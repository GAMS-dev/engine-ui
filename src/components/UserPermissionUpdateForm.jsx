import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import Select from 'react-select';
import { getResponseError } from "./util";
import NamespacePermissionSelector from "./NamespacePermissionSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const UserPermissionUpdateForm = () => {
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { userToEdit } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [IDPLoading, setIDPLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [currentRole, setCurrentRole] = useState(null);
    const [inviterName, setInviterName] = useState(null);
    const [newRole, setNewRole] = useState("user");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currNamespacePermissions, setCurrNamespacePermissions] = useState([]);
    const [namespacePermissions, setNamespacePermissions] = useState([]);
    const [availableIdentityProviders, setAvailableIdentityProviders] = useState([]);
    const [selectedIdentityProvidersAllowed, setSelectedIdentityProvidersAllowed] = useState(null);

    const [userEdited, setUserEdited] = useState(false);
    const [requierDataError, setRequierDataError] = useState(false);
    const [requierDataErrorMessage, setRequierDataErrorMessage] = useState('');

    const updateNewRole = e => {
        setNewRole(e.target.value);
    }

    useEffect(() => {
        if (currentRole) {
            setNewRole(currentRole);
        }
    }, [currentRole]);

    useEffect(() => {
        const fetchRequiredData = async () => {
            const requests = [
                axios.get(`${server}/namespaces/`),
                axios.get(`${server}/users/`, {
                    headers: { "X-Fields": "roles,inviter_name" },
                    params: { username: userToEdit }
                })
            ];
            (await Promise.allSettled(requests)).forEach((result, idx) => {
                if (result.status === "rejected") {
                    if (idx === 0) {
                        setRequierDataError(true)
                        setRequierDataErrorMessage(`Problems while retrieving namespaces. Error message: ${getResponseError(result.reason)}.`);
                    } else {
                        setRequierDataError(true)
                        setRequierDataErrorMessage(`Problems while retrieving user roles. Error message: ${getResponseError(result.reason)}.`);
                    }
                    return
                }
                const responseData = result.value.data
                if (idx === 0) {
                    const nsPerm = responseData.map(el => ({
                        name: el.name,
                        perm: el.permissions.filter(perm => perm.username === userToEdit).map(el => el.permission)[0],
                        maxPerm: 7
                    }));
                    setNamespacePermissions(nsPerm);
                    setCurrNamespacePermissions(nsPerm.map(el => ({ name: el.name, perm: el.perm })));
                    return
                }
                const currentRoleTmp = responseData[0].roles[0];
                setInviterName(responseData[0].inviter_name);
                setCurrentRole(currentRoleTmp == null ? "user" : currentRoleTmp);
            })
            setIsLoading(false)
        };
        fetchRequiredData();
    }, [server, jwt, userToEdit, username]);

    useEffect(() => {
        const fetchAvailableIDPs = async () => {
            if (inviterName == null) {
                return;
            }
            try {
                setIDPLoading(true);
                const availableProvidersPromise = axios.get(`${server}/users/inviters-providers/${encodeURIComponent(inviterName)}`);
                let selectedProvidersTmp = null;
                if (currentRole === "inviter") {
                    const currentProvidersResponse = await axios.get(`${server}/users/inviters-providers/${encodeURIComponent(userToEdit)}`);
                    selectedProvidersTmp = currentProvidersResponse.data.map(provider => ({ value: provider.name, label: provider.name }));
                }
                const availableProvidersResponse = await availableProvidersPromise;
                const availableIdentityProvidersTmp = availableProvidersResponse.data.map(provider => ({ value: provider.name, label: provider.name }));
                setAvailableIdentityProviders(availableIdentityProvidersTmp);
                setSelectedIdentityProvidersAllowed(selectedProvidersTmp == null ? availableIdentityProvidersTmp : selectedProvidersTmp);
            } catch (err) {
                setErrorMsg(`Problems while retrieving identity providers. Error message: ${getResponseError(err)}.`);
            } finally {
                setIDPLoading(false);
            }
        }
        fetchAvailableIDPs();
    }, [server, jwt, userToEdit, currentRole, inviterName]);

    const handleUserUpdateSubmission = async () => {
        setIsSubmitting(true);
        if (currentRole !== newRole) {
            if (newRole === "inviter" && selectedIdentityProvidersAllowed.length === 0) {
                setSubmissionErrorMsg('Please select at least one identity provider that the user is allowed to invite with, or select the "User" role.');
                setIsSubmitting(false);
                return;
            }
            try {
                await axios.put(`${server}/users/role`, {
                    username: userToEdit,
                    roles: newRole === "user" ? [] : [newRole]
                });
                setCurrentRole(newRole);
            }
            catch (err) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`An error occurred while updating user roles. Error message: ${getResponseError(err)}.`);
                return;
            }
        }
        if (newRole === "inviter" && selectedIdentityProvidersAllowed.length > 0) {
            try {
                const invitersProvidersForm = new FormData();
                selectedIdentityProvidersAllowed.forEach(provider => {
                    invitersProvidersForm.append("name", provider.value);
                });
                await axios.put(`${server}/users/inviters-providers/${encodeURIComponent(userToEdit)}`, invitersProvidersForm);
            }
            catch (err) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`An error occurred while updating available identity providers. Error message: ${getResponseError(err)}.`);
                return;
            }
        }
        if (newRole !== "admin") {
            for (let i = 0; i < namespacePermissions.length; i++) {
                const nsPerm = namespacePermissions[i];
                if (nsPerm.perm == null || currNamespacePermissions.findIndex(el => el.name === nsPerm.name && el.perm === nsPerm.perm) !== -1) {
                    continue;
                }

                const userUpdateForm = new FormData();
                userUpdateForm.append("username", userToEdit);
                userUpdateForm.append("permissions", nsPerm.perm);
                try {
                    await axios.put(`${server}/namespaces/${encodeURIComponent(nsPerm.name)}/permissions`,
                        userUpdateForm);
                }
                catch (err) {
                    setSubmissionErrorMsg(`An error occurred while updating user permissions. Error message: ${getResponseError(err)}.`);
                    setIsSubmitting(false);
                    return;
                }
            }
            setCurrNamespacePermissions(namespacePermissions.map(el => ({ name: el.name, perm: el.perm })));
        }
        setAlertMsg("success:User permissions successfully updated!");
        setUserEdited(true);
    }

    return (
        requierDataError ?
            <div className="alert alert-danger mt-3">
                <p><strong>{requierDataErrorMessage}</strong></p>
            </div> :
            <>
                <div>
                    {isLoading ? <ClipLoader /> :
                        (errorMsg ?
                            <div className="invalid-feedback text-center" style={{ display: "block" }
                            } >
                                {errorMsg}
                            </div> :
                            <form
                                className="m-auto"
                                onSubmit={e => {
                                    e.preventDefault();
                                    handleUserUpdateSubmission();
                                    return false;
                                }}
                            >
                                <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                                    {submissionErrorMsg}
                                </div>
                                <fieldset disabled={isSubmitting}>
                                    <div className="mb-3">
                                        <label htmlFor="roleSelector">
                                            {`Specify a role for the user${newRole === currentRole ? "" : " (*)"}`}
                                        </label>
                                        <select id="roleSelector" className="form-control form-select" value={newRole} onChange={updateNewRole}>
                                            <option key="user" value="user">User</option>
                                            <option key="inviter" value="inviter">Inviter</option>
                                            {(roles.find(role => role === "admin") !== undefined) &&
                                                <option key="admin" value="admin">Admin</option>}
                                        </select>
                                    </div>
                                    {newRole === "inviter" && availableIdentityProviders.length > 1 &&
                                        (IDPLoading ? <ClipLoader /> : <div className="mb-3">
                                            <label htmlFor="identityProvidersAllowed">
                                                Identity providers user is allowed to invite with
                                            </label>
                                            <Select
                                                inputId="identityProvidersAllowed"
                                                value={selectedIdentityProvidersAllowed}
                                                isMulti={true}
                                                isSearchable={true}
                                                onChange={selected => setSelectedIdentityProvidersAllowed(selected)}
                                                options={availableIdentityProviders}
                                            />
                                        </div>)}
                                    {newRole !== "admin" && <NamespacePermissionSelector
                                        namespacePermissions={namespacePermissions}
                                        setNamespacePermissions={setNamespacePermissions}
                                    />}
                                </fieldset>
                                <div className="mt-3">
                                    <SubmitButton isSubmitting={isSubmitting}>
                                        Update Permissions
                                    </SubmitButton>
                                </div>
                                {userEdited && <Navigate to={`/users/${userToEdit}/usage`} />}
                            </form>)}
                </div>
            </>
    );
}

export default UserPermissionUpdateForm;
