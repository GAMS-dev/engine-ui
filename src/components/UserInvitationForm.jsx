import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { getResponseError } from "./util";
import NamespacePermissionSelector from "./NamespacePermissionSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const UserInvitationForm = () => {
    const [{ jwt, server, roles }] = useContext(AuthContext);

    const [isLoading, setIsLoading] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [copySuccessMsg, setCopySuccessMsg] = useState("");
    const [role, setRole] = useState("user");
    const [namespacePermissions, setNamespacePermissions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [invitationCode, setInvitationCode] = useState("");

    useEffect(() => {
        axios
            .get(`${server}/namespaces/permissions/me`)
            .then(res => {
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An error occurred while retrieving namespaces. Please try again later.");
                    setIsLoading(false);
                    return;
                }
                setNamespacePermissions(res.data.map(el => ({ name: el.name, maxPerm: el.permission })));
                setIsLoading(false);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while retrieving namespaces. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
            });
    }, [server, jwt]);

    const handleInvitationSubmission = () => {
        setIsSubmitting(true);
        const invitationSubmissionForm = new FormData();

        if (role !== "user") {
            invitationSubmissionForm.append("roles", role);
        }
        for (let i = 0; i < namespacePermissions.length; i++) {
            if (namespacePermissions[i].perm == null || namespacePermissions[i].perm < 1) {
                continue;
            }
            invitationSubmissionForm.append("namespace_permissions",
                `${namespacePermissions[i].perm}@${namespacePermissions[i].name}`);
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
                                            Select a role to assign to the invitee
                                </label>
                                        <select id="roleSelector" className="form-control" value={role} onChange={updateRole}>
                                            <option key="user" value="user">User</option>
                                            <option key="inviter" value="inviter">Inviter</option>
                                            {(roles.find(role => role === "admin") !== undefined) &&
                                                <option key="admin" value="admin">Admin</option>}
                                        </select>
                                    </div>
                                }
                                {role !== "admin" && <NamespacePermissionSelector
                                    namespacePermissions={namespacePermissions}
                                    setNamespacePermissions={setNamespacePermissions}
                                />}
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Create invitation
                        </SubmitButton>
                            </div>
                        </form>
                    </div>
                    :
                    <>
                        <div className="mt-5">Your invitation code is: <code>{invitationCode}</code></div>
                        <div>
                            <button
                                type="button"
                                className="btn btn-link"
                                onClick={() => { navigator.clipboard.writeText(invitationCode); setCopySuccessMsg("Copied!"); }}>
                                Copy to clipboard
                    </button>
                            {copySuccessMsg}
                        </div>
                    </>
                )}
        </>
    );
}

export default UserInvitationForm;
