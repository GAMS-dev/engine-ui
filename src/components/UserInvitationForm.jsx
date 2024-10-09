import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import axios from "axios";
import Select from 'react-select';
import { formatInstancesSelectInput, getInstanceData, getResponseError } from "./util";
import NamespacePermissionSelector from "./NamespacePermissionSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import UserQuotaSelector from "./UserQuotaSelector";
import { ServerInfoContext } from "../ServerInfoContext";
import { UserSettingsContext } from "./UserSettingsContext";

const UserInvitationForm = () => {
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [serverInfo,] = useContext(ServerInfoContext);
    const [userSettings,] = useContext(UserSettingsContext);

    const [isLoading, setIsLoading] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [copySuccessMsg, setCopySuccessMsg] = useState("");
    const [role, setRole] = useState("user");
    const [namespacePermissions, setNamespacePermissions] = useState([]);
    const [assignInstances, setAssignInstances] = useState(false);
    const [assignLicense, setAssignLicense] = useState(false);
    const [license, setLicense] = useState("");
    const [availableInstances, setAvailableInstances] = useState([]);
    const [selectedInstancesAllowed, setSelectedInstancesAllowed] = useState(null);
    const [defaultInstance, setDefaultInstance] = useState(null);
    const [assignQuotas, setAssignQuotas] = useState(false);
    const [quotas, setQuotas] = useState(null);

    const [availableIdentityProviders, setAvailableIdentityProviders] = useState([{ value: "gams_engine", label: "gams_engine" }]);
    const [ldapIdentityProviders, setLdapIdentityProviders] = useState([]);
    const [selectedIdentityProvidersAllowed, setSelectedIdentityProvidersAllowed] = useState({ value: "gams_engine", label: "gams_engine" });
    const [identityProvider, setIdentityProvider] = useState({ value: "gams_engine", label: "gams_engine" });
    const [identityProviderSubject, setIdentityProviderSubject] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState("");
    const [requiredDataError, setRequiredDataError] = useState(false);
    const [requiredDataErrorMessage, setRequiredDataErrorMessage] = useState('');

    const [invitationCode, setInvitationCode] = useState("");
    const [showConfirmNoInstanceDialog, setShowConfirmNoInstanceDialog] = useState(false);

    useEffect(() => {
        const fetchRequiredData = async () => {
            const requests = [
                axios
                    .get(`${server}/namespaces/`, {
                        headers: { "X-Fields": "name,permissions" }
                    }),
                axios
                    .get(`${server}/users/inviters-providers/${encodeURIComponent(username)}`)
            ]
            try {
                const instanceData = await getInstanceData(server, username);
                const availableInstancesTmp = formatInstancesSelectInput(instanceData.instances, userSettings.multiplierUnit);
                if (availableInstancesTmp.length > 0) {
                    setAvailableInstances(availableInstancesTmp);
                    setSelectedInstancesAllowed([availableInstancesTmp[0]]);
                    setDefaultInstance(availableInstancesTmp[0]);
                }
            } catch (err) {
                setRequiredDataError(true)
                setRequiredDataErrorMessage(`An error occurred fetching instances. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
                return;
            }
            (await Promise.allSettled(requests)).forEach((result, idx) => {
                if (result.status === "rejected") {
                    if (idx === 0) {
                        setRequiredDataError(true)
                        setRequiredDataErrorMessage(`Problems while retrieving namespaces. Error message: ${getResponseError(result.reason)}.`)
                    } else {
                        setRequiredDataError(true)
                        setRequiredDataErrorMessage(`Problems while retrieving identity providers. Error message: ${getResponseError(result.reason)}.`)
                    }
                    return
                }
                const responseData = result.value.data
                if (idx === 0) {
                    setNamespacePermissions(responseData.map(el =>
                    ({
                        name: el.name, maxPerm: roles && roles.includes("admin") ? 7 : el.permissions
                            .reduce((acc, curr) => (curr.username === username ? curr.permission : acc), 0)
                    })))
                    return
                }
                const availableIdentityProvidersTmp = responseData.map(provider => ({ value: provider.name, label: provider.name }))
                setLdapIdentityProviders(responseData.filter(provider => provider.is_ldap_identity_provider === true).map(provider => provider.name))
                setAvailableIdentityProviders(availableIdentityProvidersTmp);
                setSelectedIdentityProvidersAllowed(availableIdentityProvidersTmp)
            })
            setIsLoading(false)
        };
        fetchRequiredData();
    }, [server, jwt, roles, username, userSettings]);

    const handleInvitationSubmission = async (forceSubmission) => {
        setFormErrors("");
        if (role === "inviter" && selectedIdentityProvidersAllowed.length === 0) {
            setSubmissionErrorMsg('Please select at least one identity provider that the user is allowed to invite with, or select the "User" role for the invitee.');
            return;
        }
        setIsSubmitting(true);
        const invitationSubmissionForm = new FormData();

        if (role !== "user") {
            invitationSubmissionForm.append("roles", role);
        }
        if (role !== "admin") {
            for (let i = 0; i < namespacePermissions.length; i++) {
                if (namespacePermissions[i].perm != null && namespacePermissions[i].perm >= 1) {
                    invitationSubmissionForm.append("namespace_permissions",
                        `${namespacePermissions[i].perm}@${namespacePermissions[i].name}`);
                }
                if (namespacePermissions[i].groups != null && namespacePermissions[i].groups.length > 0) {
                    namespacePermissions[i].groups.forEach((label) => {
                        invitationSubmissionForm.append("user_groups",
                            `${label}@${namespacePermissions[i].name}`)
                    });
                }
            }
            if (assignQuotas) {
                if (quotas == null) {
                    setSubmissionErrorMsg("Invalid quotas entered.");
                    setIsSubmitting(false);
                    return;
                }
                if (quotas.parallel != null) {
                    invitationSubmissionForm.append("parallel_quota", quotas.parallel);
                }
                if (quotas.volume != null) {
                    invitationSubmissionForm.append("volume_quota", quotas.volume);
                }
                if (quotas.disk != null) {
                    invitationSubmissionForm.append("disk_quota", quotas.disk);
                }
            }
            if (assignInstances) {
                selectedInstancesAllowed.forEach(instance => {
                    invitationSubmissionForm.append("labels", instance.value);
                });
                if (selectedInstancesAllowed.length > 0) {
                    invitationSubmissionForm.append("default_label", defaultInstance.value);
                } else if (forceSubmission !== true) {
                    setShowConfirmNoInstanceDialog(true);
                    return
                }
            } else {
                invitationSubmissionForm.append("inherit_instances", true);
            }
        }
        if (assignLicense && license !== "") {
            const license_b64 = window.btoa(license);
            invitationSubmissionForm.append("gams_license", license_b64);
        }
        if (role === "inviter") {
            selectedIdentityProvidersAllowed.forEach(provider => {
                invitationSubmissionForm.append("invitable_identity_providers", provider.value);
            });
        }
        if (availableIdentityProviders.length > 1) {
            invitationSubmissionForm.append("identity_provider_name", identityProvider.value);
        } else {
            invitationSubmissionForm.append("identity_provider_name", availableIdentityProviders[0].value);
        }
        if (ldapIdentityProviders.includes(identityProvider.value)) {
            invitationSubmissionForm.append("identity_provider_user_subject", identityProviderSubject);
        }
        let inviteReq
        try {
            inviteReq = await axios.post(
                `${server}/users/invitation`,
                invitationSubmissionForm,
                {
                    "Content-Type": "multipart/form-data"
                }
            )
        } catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                setFormErrors(err.response.data.errors);
                setSubmissionErrorMsg('Problems creating invitation code.')
            } else {
                setSubmissionErrorMsg(`An error occurred while creating an invitation code. Error message: ${getResponseError(err)}.`)
            }
            setIsSubmitting(false)
            return
        }
        setIsSubmitting(false);
        if (!("invitation_token" in inviteReq.data)) {
            setSubmissionErrorMsg("An error occurred while creating an invitation code. Please try again later.");
            setIsSubmitting(false);
            return;
        }
        setInvitationCode(inviteReq.data.invitation_token);
    }
    const updateRole = e => {
        setRole(e.target.value);
    }

    return <>
        {requiredDataError ?
            <div className="alert alert-danger mt-3">
                <p><strong>{requiredDataErrorMessage}</strong></p>
            </div> :
            <>
                {isLoading ? <ClipLoader /> :
                    (invitationCode === "" ?
                        <div>
                            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                                <h1 className="h2">Invite User</h1>
                            </div>
                            <form
                                className="m-auto"
                                onSubmit={e => {
                                    e.preventDefault();
                                    handleInvitationSubmission();
                                    return false;
                                }}
                            >
                                <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                                    {submissionErrorMsg}
                                </div>
                                <fieldset disabled={isSubmitting}>
                                    {roles.length > 0 &&
                                        <div className="mt-3 mb-3">
                                            <label htmlFor="roleSelector">
                                                Select a role to be assigned to the invitee
                                            </label>
                                            <select id="roleSelector" className="form-control form-select" value={role} onChange={updateRole}>
                                                <option key="user" value="user">User</option>
                                                <option key="inviter" value="inviter">Inviter</option>
                                                {roles && roles.includes('admin') &&
                                                    <option key="admin" value="admin">Admin</option>}
                                            </select>
                                        </div>
                                    }
                                    {role === "inviter" && availableIdentityProviders.length === 0 &&
                                        <div className="invalid-feedback text-center" style={{ display: "block" }}>
                                            There are no available identity providers you could give this user could invite with.
                                        </div>
                                    }
                                    {role !== "admin" &&
                                        <>
                                            <NamespacePermissionSelector
                                                namespacePermissions={namespacePermissions}
                                                setNamespacePermissions={setNamespacePermissions}
                                                includeGroups={true}
                                                highlight={true}
                                            />
                                            <div className="form-check mt-3 mb-3">
                                                <input type="checkbox" className="form-check-input" checked={assignQuotas} onChange={e => setAssignQuotas(e.target.checked)}
                                                    id="assignQuotas" />
                                                <label className="form-check-label" htmlFor="assignQuotas">Assign Quotas?</label>
                                            </div>
                                            {
                                                assignQuotas === true &&
                                                <UserQuotaSelector
                                                    setQuotas={setQuotas} />
                                            }
                                            {serverInfo.in_kubernetes === true && availableInstances.length > 0 &&
                                                <>
                                                    <div className="form-check mt-3 mb-3">
                                                        <input type="checkbox" className="form-check-input"
                                                            checked={assignInstances !== true} onChange={e => setAssignInstances(!e.target.checked)}
                                                            id="assignInstances" />
                                                        <label className="form-check-label" htmlFor="assignInstances">
                                                            {(availableInstances.length === 0 || (roles && roles.includes("admin"))) ?
                                                                "Allowed to use any instance/raw resource requests" :
                                                                "Inherit instances from you"}</label>
                                                    </div>
                                                    {assignInstances ?
                                                        <>
                                                            <div className="mb-3">
                                                                <label htmlFor="instancesAllowed">
                                                                    Instances user is allowed to use
                                                                </label>
                                                                <Select
                                                                    inputId="instancesAllowed"
                                                                    value={selectedInstancesAllowed}
                                                                    isMulti={true}
                                                                    isSearchable={true}
                                                                    onChange={selected => {
                                                                        setSelectedInstancesAllowed(selected);
                                                                        if (defaultInstance == null ||
                                                                            !selected.map(el => el.value).includes(selected.value)) {
                                                                            setDefaultInstance(selected[0]);
                                                                        }
                                                                    }}
                                                                    options={availableInstances}
                                                                />
                                                            </div>
                                                            {selectedInstancesAllowed.length > 0 ?
                                                                <div className="mb-3">
                                                                    <label htmlFor="instancesDefault">
                                                                        Default Instance
                                                                    </label>
                                                                    <Select
                                                                        inputId="instancesDefault"
                                                                        isClearable={false}
                                                                        value={defaultInstance}
                                                                        isSearchable={true}
                                                                        onChange={selected => setDefaultInstance(selected)}
                                                                        options={selectedInstancesAllowed}
                                                                    />

                                                                </div> : <></>}
                                                        </> : <></>}
                                                </>}
                                        </>
                                    }
                                    {roles && roles.includes('admin') && <div className="form-check mt-3 mb-3">
                                        <input type="checkbox" className="form-check-input"
                                            checked={assignLicense !== false} onChange={e => setAssignLicense(e.target.checked)}
                                            id="assignLicense" />
                                        <label className="form-check-label" htmlFor="assignLicense">Assign License?</label>
                                        {assignLicense && <div>
                                            <label htmlFor="licenseBox">
                                                GAMS License for User
                                            </label>
                                            <textarea
                                                id="licenseBox"
                                                rows="6"
                                                cols="50"
                                                className="form-control monospace no-resize"
                                                value={license}
                                                onChange={e => setLicense(e.target.value)} >
                                            </textarea> </div>
                                        }
                                    </div>}
                                    {role === "inviter" && availableIdentityProviders.length > 1 &&
                                        <div className="mb-3">
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
                                        </div>}
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
                                    {ldapIdentityProviders.includes(identityProvider.value) &&
                                        <div className="mb-3">
                                            <label htmlFor="identityProviderSubject" className="visually-hidden">
                                                LDAP login name
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.identity_provider_user_subject ? " is-invalid" : "")}
                                                placeholder="LDAP login name"
                                                name="identityProviderSubject"
                                                value={identityProviderSubject}
                                                onChange={e => setIdentityProviderSubject(e.target.value)}
                                                required
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.identity_provider_user_subject ? formErrors.identity_provider_user_subject : ""}
                                            </div>
                                        </div>}
                                </fieldset>
                                <div className="mt-3">
                                    <SubmitButton isSubmitting={isSubmitting}>
                                        Create Invitation
                                    </SubmitButton>
                                </div>
                            </form>
                        </div>
                        :
                        <>
                            <div className="mt-5">Your invitation code is: <code>{invitationCode}</code></div>
                            {window.isSecureContext && <div>
                                <button
                                    type="button"
                                    className="btn btn-link"
                                    onClick={() => { navigator.clipboard.writeText(invitationCode); setCopySuccessMsg("Copied!"); }}>
                                    Copy to clipboard
                                </button>
                                {copySuccessMsg}
                            </div>}
                        </>
                    )}
                <Modal show={showConfirmNoInstanceDialog} onHide={() => setShowConfirmNoInstanceDialog(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Please confirm</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>You are about to invite a user without instances. As a result, this user will not be able to solve any jobs until instances are assigned to him/her.</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowConfirmNoInstanceDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => {
                            setShowConfirmNoInstanceDialog(false);
                            handleInvitationSubmission(true);
                        }}>
                            Continue
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        }</>
}

export default UserInvitationForm;
