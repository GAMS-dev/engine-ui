import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import NamespacePermissionSelector from "./NamespacePermissionSelector";
import SubmitButton from "./SubmitButton";

const UserUpdateForm = () => {
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { username } = useParams();

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [currentRole, setCurrentRole] = useState(null);
    const [newRole, setNewRole] = useState("user");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currNamespacePermissions, setCurrNamespacePermissions] = useState([]);
    const [namespacePermissions, setNamespacePermissions] = useState([]);

    const [userEdited, setUserEdited] = useState(false);

    const updateNewRole = e => {
        setNewRole(e.target.value);
    }

    useEffect(() => {
        if (currentRole) {
            setNewRole(currentRole);
        }
    }, [currentRole]);

    useEffect(() => {
        axios
            .get(`${server}/namespaces/`)
            .then(res => {
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An error occurred while retrieving namespaces. Please try again later.");
                    return;
                }
                const nsPerm = res.data.map(el => ({
                    name: el.name,
                    perm: el.permissions.filter(perm => perm.username === username).map(el => el.permission)[0],
                    maxPerm: 7
                }));
                setNamespacePermissions(nsPerm);
                setCurrNamespacePermissions(nsPerm.map(el => el.perm));
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while retrieving namespaces. Error message: ${err.message}.`);
            });
        axios
            .get(`${server}/users/`, {
                headers: { "X-Fields": "roles" },
                params: { username: username }
            })
            .then(res => {
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An error occurred while retrieving user roles. Please try again later.");
                    return;
                }
                setCurrentRole(res.data[0].roles[0]);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while while retrieving user roles. Error message: ${err.message}.`);
            });
    }, [server, jwt, username]);

    const handleUserUpdateSubmission = async () => {
        setIsSubmitting(true);
        if (currentRole !== newRole) {
            try {
                const res = await axios.put(`${server}/users/role`, {
                    username: username,
                    roles: newRole === "user" ? [] : [newRole]
                });
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An unexpected error occurred while updating user roles. Please try again later.");
                    setIsSubmitting(false);
                    return;
                }
                setCurrentRole(newRole);
            }
            catch (e) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`An error occurred while updating user roles. Error message: ${e.message}.`);
                return;
            }
        }
        for (let i = 0; i < namespacePermissions.length; i++) {
            const nsPerm = namespacePermissions[i];
            if (nsPerm.perm == null || currNamespacePermissions[i] === nsPerm.perm) {
                continue;
            }

            const userUpdateForm = new FormData();
            userUpdateForm.append("username", username);
            userUpdateForm.append("permissions", nsPerm.perm);
            try {
                const res = await axios.put(`${server}/namespaces/${nsPerm.name}/permissions`,
                    userUpdateForm);
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An unexpected error occurred while updating user permissions. Please try again later.");
                    setIsSubmitting(false);
                    return;
                }
            }
            catch (e) {
                setSubmissionErrorMsg(`An error occurred while updating user permissions. Error message: ${e.message}.`);
                setIsSubmitting(false);
                return;
            }
        }
        setCurrNamespacePermissions(namespacePermissions);
        setAlertMsg("success:User permissions successfully updated!");
        setUserEdited(true);
    }

    return (
        <>
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 className="h2">Edit Permissions of User: {username}</h1>
                </div>
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
                        <div className="form-group">
                            <label htmlFor="roleSelector">
                                {`Specify a role for the user${newRole === currentRole ? "" : " (*)"}`}
                            </label>
                            <select id="roleSelector" className="form-control" value={newRole} onChange={updateNewRole}>
                                <option key="user" value="user">User</option>
                                <option key="inviter" value="inviter">Inviter</option>
                                {(roles.find(role => role === "admin") !== undefined) &&
                                    <option key="admin" value="admin">Admin</option>}
                            </select>
                        </div>
                        <NamespacePermissionSelector
                            namespacePermissions={namespacePermissions}
                            setNamespacePermissions={setNamespacePermissions}
                        />
                    </fieldset>
                    <div className="mt-3">
                        <SubmitButton isSubmitting={isSubmitting}>
                            Update permissions
                    </SubmitButton>
                    </div>
                    {userEdited && <Redirect to="/users" />}
                </form>
            </div>
        </>
    );
}

export default UserUpdateForm;
