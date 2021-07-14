import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import Select from 'react-select';
import { getResponseError } from "./util";
import NamespacePermissionSelector from "./NamespacePermissionSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import UserQuotaSelector from "./UserQuotaSelector";
import { ServerInfoContext } from "../ServerInfoContext";

const UserInvitationForm = () => {
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [serverInfo,] = useContext(ServerInfoContext);

    const [isLoading, setIsLoading] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [copySuccessMsg, setCopySuccessMsg] = useState("");
    const [role, setRole] = useState("user");
    const [namespacePermissions, setNamespacePermissions] = useState([]);
    const [assignInstances, setAssignInstances] = useState(false);
    const [availableInstances, setAvailableInstances] = useState([]);
    const [selectedInstancesAllowed, setSelectedInstancesAllowed] = useState(null);
    const [defaultInstance, setDefaultInstance] = useState(null);
    const [assignQuotas, setAssignQuotas] = useState(false);
    const [quotas, setQuotas] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [invitationCode, setInvitationCode] = useState("");

    useEffect(() => {
        const fetchRequiredData = async () => {
            const requests = [
                axios
                    .get(`${server}/namespaces/`, {
                        headers: { "X-Fields": "name,permissions" }
                    })
                    .then(res => {
                        if (res.status !== 200) {
                            setSubmissionErrorMsg("An error occurred while retrieving namespaces. Please try again later.");
                            setIsLoading(false);
                            return;
                        }
                        setNamespacePermissions(res.data.map(el =>
                        ({
                            name: el.name, maxPerm: roles && roles.includes("admin") ? 7 : el.permissions
                                .reduce((acc, curr) => (curr.username === username ? curr.permission : acc), 0)
                        })));
                    })
                    .catch(err => {
                        setSubmissionErrorMsg(`Problems while retrieving namespaces. Error message: ${getResponseError(err)}.`);
                    })
            ]
            try {
                let availableInstancesTmp;
                if (roles && roles.includes('admin')) {
                    const instanceData = await axios.get(`${server}/usage/instances`);
                    availableInstancesTmp = instanceData.data.map(instance => ({
                        "value": instance.label,
                        "label": instance.label
                    }));
                } else {
                    const instanceData = await axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
                    availableInstancesTmp = instanceData.data.instances_available.map(instance => ({
                        "value": instance.label,
                        "label": instance.label
                    }));
                }
                if (availableInstancesTmp && availableInstancesTmp.length > 0) {
                    setAvailableInstances(availableInstancesTmp);
                    setDefaultInstance(availableInstancesTmp[0]);
                }
            } catch (err) {
                setSubmissionErrorMsg(`An error occurred fetching instances. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
                return;
            }
            try {
                await Promise.all(requests);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchRequiredData();
    }, [server, jwt, roles, username]);

    const handleInvitationSubmission = () => {
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
                    invitationSubmissionForm.append("labels", instance.label);
                });
                invitationSubmissionForm.append("default_label", defaultInstance.value);
            }
        }
        axios
            .post(
                `${server}/users/invitation`,
                invitationSubmissionForm,
                {
                    "Content-Type": "multipart/form-data"
                }
            )
            .then(res => {
                setIsSubmitting(false);
                if (res.status !== 201 || !("invitation_token" in res.data)) {
                    setSubmissionErrorMsg("An error occurred while creating an invitation code. Please try again later.");
                    setIsSubmitting(false);
                    return;
                }
                setInvitationCode(res.data.invitation_token);
            })
            .catch(err => {
                setSubmissionErrorMsg(`An error occurred while creating an invitation code. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }
    const updateRole = e => {
        setRole(e.target.value);
    }

    return (
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
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="roleSelector">
                                            Select a role to be assigned to the invitee
                                        </label>
                                        <select id="roleSelector" className="form-control" value={role} onChange={updateRole}>
                                            <option key="user" value="user">User</option>
                                            <option key="inviter" value="inviter">Inviter</option>
                                            {roles && roles.includes('admin') &&
                                                <option key="admin" value="admin">Admin</option>}
                                        </select>
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
                                        <div className="form-group form-check mt-3 mb-3">
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
                                                <div className="form-group form-check mt-3 mb-3">
                                                    <input type="checkbox" className="form-check-input"
                                                        checked={assignInstances !== true} onChange={e => setAssignInstances(!e.target.checked)}
                                                        id="assignInstances" />
                                                    <label className="form-check-label" htmlFor="assignInstances">User is allowed to use raw resource requests?</label>
                                                </div>
                                                {assignInstances ?
                                                    <>
                                                        <div className="form-group">
                                                            <label htmlFor="instancesAllowed">
                                                                Instances user is allowed to use
                                                            </label>
                                                            <Select
                                                                id="instancesAllowed"
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
                                                        <div className="form-group">
                                                            <label htmlFor="instancesDefault">
                                                                Default Instance
                                                            </label>
                                                            <Select
                                                                id="instancesDefault"
                                                                isClearable={false}
                                                                value={defaultInstance}
                                                                isSearchable={true}
                                                                onChange={selected => setDefaultInstance(selected)}
                                                                options={selectedInstancesAllowed}
                                                            />

                                                        </div>
                                                    </> : <></>}
                                            </>}
                                    </>}
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
        </>
    );
}

export default UserInvitationForm;
