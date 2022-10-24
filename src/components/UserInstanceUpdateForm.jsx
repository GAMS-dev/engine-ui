import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import Select from 'react-select';
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const UserInstanceUpdateForm = () => {
    const [{ jwt, server, username, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { userToEdit } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [useRawRequests, setUseRawRequests] = useState(false);
    const [unassignDefault, setUnassignDefault] = useState(false);
    const [instancesAllowed, setInstancesAllowed] = useState(null);
    const [selectedInstancesAllowed, setSelectedInstancesAllowed] = useState([]);
    const [defaultInstance, setDefaultInstance] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [instancesInfoMsg, setInstancesInfoMsg] = useState("");
    const [defaultInstanceInfoMsg, setDefaultInstanceInfoMsg] = useState("");
    const [inviterHasInstancesAssigned, setInviterHasInstancesAssigned] = useState(false);

    const [userEdited, setUserEdited] = useState(false);
    const [userToEditIsAdmin, setUserToEditIsAdmin] = useState(false);
    const [inviterName, setInviterName] = useState("");

    useEffect(() => {
        const fetchRequiredData = async () => {
            let userToEditIsAdminTmp = false;
            try {
                const resUserInfo = await axios
                    .get(`${server}/users/`, {
                        params: {
                            username: userToEdit
                        },
                        headers: {
                            "X-Fields": "roles,inviter_name"
                        }
                    });
                if (resUserInfo.status !== 200) {
                    setErrorMsg("An error occurred while retrieving user information. Please try again later.");
                    setIsLoading(false);
                    return;
                }
                if (!resUserInfo.data || resUserInfo.data.length === 0) {
                    setErrorMsg("User not found.");
                    setIsLoading(false);
                    return;
                }
                const inviterNameTmp = resUserInfo.data[0].inviter_name;
                setInviterName(inviterNameTmp);

                userToEditIsAdminTmp = resUserInfo.data[0].roles &&
                    resUserInfo.data[0].roles.includes("admin");
                setUserToEditIsAdmin(userToEditIsAdminTmp);

                const resUser = await axios
                    .get(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`);
                const resInviter = inviterNameTmp == null ? resUser : await axios
                    .get(`${server}/usage/instances/${encodeURIComponent(inviterNameTmp)}`);

                const inviterHasInstancesAssignedTmp = resInviter.data && resInviter.data.instances_available && resInviter.data.instances_available.length > 0;
                setInviterHasInstancesAssigned(inviterHasInstancesAssignedTmp);

                let instancesAllowedTmp = [];

                if (!userToEditIsAdminTmp && resInviter.data && resInviter.data.instances_available.length > 0) {
                    instancesAllowedTmp = resInviter.data.instances_available
                        .map(instance => ({
                            "value": instance.label,
                            "label": instance.label
                        }));
                } else {
                    // in case inviter is allowed to use raw resource requests,
                    // we can assign any instance available
                    const globalInstanceData = await axios
                        .get(`${server}/usage/instances`);
                    if (!globalInstanceData.data ||
                        globalInstanceData.data.length === 0) {
                        setErrorMsg("No instances available.");
                        setIsLoading(false);
                        return;
                    }
                    instancesAllowedTmp = globalInstanceData.data
                        .map(instance => ({
                            "value": instance.label,
                            "label": instance.label
                        }));
                    if (userToEditIsAdminTmp) {
                        setSelectedInstancesAllowed(instancesAllowedTmp);
                    }
                }

                setInstancesAllowed(instancesAllowedTmp);

                let useRawRequestsTmp = false;

                if (resUser.data.instances_available != null && resUser.data.instances_available.length > 0) {
                    const selectedInstances = resUser.data.instances_available
                        .map(instance => ({
                            "value": instance.label,
                            "label": instance.label
                        }));
                    if (resUser.data.instances_inherited_from != null &&
                        resUser.data.instances_inherited_from !== userToEdit) {
                        setInstancesInfoMsg(`Inherited from ${resUser.data.instances_inherited_from === username ? "you" : resUser.data.instances_inherited_from
                            }`);
                        useRawRequestsTmp = true;
                    }
                    if (!userToEditIsAdminTmp) {
                        setSelectedInstancesAllowed(selectedInstances);
                    }
                } else {
                    useRawRequestsTmp = true;
                }
                if (resUser.data.default_inherited_from != null &&
                    resUser.data.default_inherited_from !== userToEdit) {
                    setDefaultInstanceInfoMsg(`Inherited from ${resUser.data.default_inherited_from === username ? "you" : resUser.data.default_inherited_from
                        } `);
                    setUnassignDefault(inviterHasInstancesAssignedTmp);
                } else {
                    setUnassignDefault(false);
                }
                if (resUser.data.default_instance && resUser.data.default_instance.label) {
                    const defaultLabel = resUser.data.default_instance.label;
                    setDefaultInstance({ "value": defaultLabel, "label": defaultLabel });
                } else {
                    useRawRequestsTmp = true;
                }
                setUseRawRequests(useRawRequestsTmp);
            }
            catch (err) {
                setErrorMsg(`Problems while while retrieving user instances. Error message: ${getResponseError(err)}.`);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchRequiredData();
    }, [server, jwt, roles, userToEdit, username]);

    const handleUserUpdateInstancesSubmission = async () => {
        setIsSubmitting(true);
        if (useRawRequests) {
            try {
                await axios.delete(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`);
                setAlertMsg(`success:Instances of user: ${userToEdit} updated successfully`);
            }
            catch (err) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`An error occurred while updating user instances. Error message: ${getResponseError(err)}.`);
                return;
            }
            if (unassignDefault) {
                setIsSubmitting(false);
                setUserEdited(true);
                return;
            }
        }
        try {
            const defaultLabel = defaultInstance.value;
            if (!defaultLabel) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`No default instance selected.`);
                return;
            }
            const requestData = {
                default_label: defaultLabel
            };
            if (!userToEditIsAdmin && !useRawRequests) {
                if (selectedInstancesAllowed == null || !selectedInstancesAllowed.findIndex(instance => instance.value === defaultLabel) === -1) {
                    setIsSubmitting(false);
                    setSubmissionErrorMsg(`The default instance: ${defaultLabel} must be part of the allowed instances.`);
                    return;
                }
                requestData['labels'] = selectedInstancesAllowed
                    .map(instance => instance.value);
            }
            await axios.put(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`, requestData);
            setAlertMsg(`success:Instances of user: ${userToEdit} updated successfully`);
            setUserEdited(true);
        }
        catch (err) {
            setIsSubmitting(false);
            setSubmissionErrorMsg(`An error occurred while updating user instances. Error message: ${getResponseError(err)}.`);
        }
    }

    return (
        <>
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 className="h2">Edit Instances of User: {userToEdit}</h1>
                </div>
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
                                handleUserUpdateInstancesSubmission();
                                return false;
                            }}
                        >
                            <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                                {submissionErrorMsg}
                            </div>
                            <fieldset disabled={isSubmitting}>
                                {!userToEditIsAdmin &&
                                    <div className="form-check mb-3">
                                        <input type="checkbox" className="form-check-input" checked={useRawRequests} onChange={e => {
                                            setUseRawRequests(e.target.checked);
                                            setUnassignDefault(e.target.checked);
                                        }}
                                            id="useRawRequests" />
                                        <label className="form-check-label" htmlFor="useRawRequests">{inviterHasInstancesAssigned ?
                                            `Inherit instances from ${inviterName === username ? "you" : inviterName}` : "Allowed to use raw resource requests"}</label>
                                    </div>}
                                {(!useRawRequests && !userToEditIsAdmin) &&
                                    <div className="form-group">
                                        <label htmlFor="instancesAllowed">
                                            Instances user is allowed to use
                                        </label>
                                        <div className="invalid-feedback text-center" style={{ display: instancesInfoMsg !== "" ? "block" : "none" }}>
                                            {instancesInfoMsg}
                                        </div>
                                        <Select
                                            id="instancesAllowed"
                                            value={selectedInstancesAllowed}
                                            isMulti={true}
                                            isSearchable={true}
                                            closeMenuOnSelect={false}
                                            blurInputOnSelect={false}
                                            onChange={selected => {
                                                setSelectedInstancesAllowed(selected);
                                                if (defaultInstance == null ||
                                                    !selected.map(el => el.value).includes(selected.value)) {
                                                    setDefaultInstance(selected[0]);
                                                }
                                            }}
                                            options={instancesAllowed}
                                        />
                                    </div>}
                                {(inviterHasInstancesAssigned && useRawRequests) &&
                                    <div className="form-check mb-3">
                                        <input type="checkbox" className="form-check-input" checked={unassignDefault} onChange={e => setUnassignDefault(e.target.checked)}
                                            id="unassignDefault" />
                                        <label className="form-check-label" htmlFor="unassignDefault">
                                            {`Inherit default from ${inviterName === username ? "you" : inviterName}`}
                                        </label>
                                    </div>}
                                {selectedInstancesAllowed.length > 0 && !unassignDefault &&
                                    <div className="form-group">
                                        <label htmlFor="instancesDefault">
                                            Default Instance
                                        </label>
                                        <div className="invalid-feedback text-center" style={{ display: defaultInstanceInfoMsg !== "" ? "block" : "none" }}>
                                            {defaultInstanceInfoMsg}
                                        </div>
                                        <Select
                                            id="instancesDefault"
                                            isClearable={false}
                                            value={defaultInstance}
                                            isSearchable={true}
                                            onChange={selected => setDefaultInstance(selected)}
                                            options={useRawRequests ? instancesAllowed : selectedInstancesAllowed}
                                        />
                                    </div>}
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Update Instances
                                </SubmitButton>
                            </div>
                        </form>)}
                {userEdited && <Navigate to="/users" />}
            </div>
        </>
    );
}

export default UserInstanceUpdateForm;
