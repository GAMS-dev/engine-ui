import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import Select from 'react-select';
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { formatInstancesSelectInput, getInstanceData, getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import { UserSettingsContext } from "./UserSettingsContext";

const UserInstanceUpdateForm = () => {
    const [{ jwt, server, username, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const [userSettings] = useContext(UserSettingsContext);
    const { userToEdit } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [inheritInstances, setInheritInstances] = useState(false);
    const [inheritDefault, setInheritDefault] = useState(false);
    const [instancesAllowed, setInstancesAllowed] = useState(null);
    const [selectedInstancesAllowed, setSelectedInstancesAllowed] = useState([]);
    const [defaultInstance, setDefaultInstance] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [instancesInheritedFrom, setInstancesInheritedFrom] = useState("");
    const [userHasNoDefaultAssigned, setUserHasNoDefaultAssigned] = useState(false);
    const [defaultInheritedFrom, setDefaultInheritedFrom] = useState("");
    const [inviterHasInstancesAssigned, setInviterHasInstancesAssigned] = useState(false);
    const [currentInstanceLabelsUser, setCurrentInstanceLabelsUser] = useState([]);
    const [deletePools, setDeletePools] = useState(false);

    const [userEdited, setUserEdited] = useState(false);
    const [userToEditIsAdmin, setUserToEditIsAdmin] = useState(false);
    const [inviterName, setInviterName] = useState("");

    useEffect(() => {
        const fetchRequiredData = async () => {
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
                if (resUserInfo.data?.length === 0) {
                    setErrorMsg("User not found.");
                    setIsLoading(false);
                    return;
                }
                const inviterNameTmp = resUserInfo.data[0].inviter_name;
                setInviterName(inviterNameTmp);

                const userToEditIsAdminTmp = resUserInfo.data[0].roles &&
                    resUserInfo.data[0].roles.includes("admin");
                setUserToEditIsAdmin(userToEditIsAdminTmp);

                const instanceDataUser = await getInstanceData(server, userToEdit);
                setCurrentInstanceLabelsUser(instanceDataUser.instances.filter(el => el.is_pool !== true).map(el => el.label));
                const instanceDataInviter = inviterNameTmp == null ? instanceDataUser : await getInstanceData(server, inviterNameTmp);

                const inviterHasInstancesAssignedTmp = instanceDataInviter.rawResourceRequestsAllowed === false;

                setInviterHasInstancesAssigned(inviterHasInstancesAssignedTmp);

                let instancesAllowedTmp = formatInstancesSelectInput(instanceDataInviter.instances, userSettings.multiplierUnit);

                if (instancesAllowedTmp.length === 0) {
                    setErrorMsg("No instances available.");
                    setIsLoading(false);
                    return;
                }

                setInstancesAllowed(instancesAllowedTmp);

                setInheritInstances(instanceDataUser.inheritedFrom == null || instanceDataUser.inheritedFrom !== userToEdit);
                setInstancesInheritedFrom(instanceDataUser.inheritedFrom);

                let selectedInstancesAllowedTmp = [];
                if (userToEditIsAdminTmp) {
                    selectedInstancesAllowedTmp = instancesAllowedTmp;
                } else {
                    selectedInstancesAllowedTmp = formatInstancesSelectInput(instanceDataUser.instances, userSettings.multiplierUnit);
                }
                setSelectedInstancesAllowed(selectedInstancesAllowedTmp);

                setInheritDefault(instanceDataUser.defaultInheritedFrom != null && instanceDataUser.defaultInheritedFrom !== userToEdit);
                setDefaultInheritedFrom(instanceDataUser.defaultInheritedFrom);
                setUserHasNoDefaultAssigned(instanceDataUser.default == null);

                if (instanceDataUser.default == null) {
                    if (selectedInstancesAllowedTmp.length > 0) {
                        setDefaultInstance(selectedInstancesAllowedTmp[0]);
                    }
                } else {
                    setDefaultInstance(instancesAllowedTmp.find(el => el.value === instanceDataUser.default));
                }
            }
            catch (err) {
                setErrorMsg(`Problems while while retrieving user instances. Error message: ${getResponseError(err)}.`);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchRequiredData();
    }, [server, jwt, roles, userToEdit, username, userSettings]);

    const handleUserUpdateInstancesSubmission = async () => {
        setIsSubmitting(true);
        if (!userToEditIsAdmin && inheritInstances) {
            try {
                await axios.delete(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`);
                setAlertMsg(`success:Instances of user: ${userToEdit} updated successfully`);
            }
            catch (err) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`An error occurred while updating user instances. Error message: ${getResponseError(err)}.`);
                return;
            }
        }
        try {
            const requestData = {};
            if (selectedInstancesAllowed.length > 0 &&
                (!inheritDefault || !inheritInstances || (inheritInstances && !inviterHasInstancesAssigned))) {
                const defaultLabel = defaultInstance.value;
                if (!defaultLabel) {
                    setIsSubmitting(false);
                    setSubmissionErrorMsg(`No default instance selected.`);
                    return;
                }
                requestData['default_label'] = defaultLabel;
            }
            if (!userToEditIsAdmin && !inheritInstances) {
                requestData['labels'] = selectedInstancesAllowed
                    .map(instance => instance.value);
                requestData['delete_pools'] = deletePools === true;
            }
            if (Object.keys(requestData).length > 0) {
                if (userToEditIsAdmin || inheritInstances) {
                    // we want to set only the default instance. Need to use dedicated endpoint for that
                    // or user will be assigned no instances.
                    await axios.put(`${server}/usage/instances/${encodeURIComponent(userToEdit)}/default`, requestData);
                } else {
                    await axios.put(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`, requestData);
                }
            }
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
                                    <>
                                        <div className="form-check mb-3">
                                            <input type="checkbox" className="form-check-input" checked={inheritInstances} onChange={e => {
                                                setInheritInstances(e.target.checked);
                                            }}
                                                id="inheritInstances" />
                                            <label className="form-check-label" htmlFor="inheritInstances">{inviterHasInstancesAssigned ?
                                                `Inherit instances from ${instancesInheritedFrom == null || instancesInheritedFrom === userToEdit ?
                                                    (inviterName === username ? "you" : inviterName) :
                                                    (instancesInheritedFrom === username ? "you" : instancesInheritedFrom)}` : "Allowed to use any instance/raw resource requests"}</label>
                                        </div>
                                        {!inheritInstances &&
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
                                                </div>
                                                {currentInstanceLabelsUser.length > 0 &&
                                                    selectedInstancesAllowed.filter(instance => currentInstanceLabelsUser.includes(instance.value)).length < currentInstanceLabelsUser.length ?
                                                    <div className="form-check mt-3">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={deletePools}
                                                            onChange={e => setDeletePools(e.target.checked)}
                                                            id="deletePools"
                                                        />
                                                        <label className="form-check-label" htmlFor="deletePools">Delete all pools associated with an instance that the user is no longer allowed to use?</label>
                                                    </div> : <></>}
                                            </>}
                                    </>}
                                {(selectedInstancesAllowed.length > 0 || inheritInstances) &&
                                    <>
                                        {inheritInstances && inviterHasInstancesAssigned && <div className="form-check mb-3">
                                            <input type="checkbox" className="form-check-input" checked={inheritDefault} onChange={e => {
                                                setInheritDefault(e.target.checked);
                                            }}
                                                id="inheritDefault" />
                                            <label className="form-check-label" htmlFor="inheritDefault">
                                                {`Inherit default instance from ${defaultInheritedFrom == null || defaultInheritedFrom === userToEdit ?
                                                    (inviterName === username ? "you" : inviterName) :
                                                    (defaultInheritedFrom === username ? "you" : defaultInheritedFrom)}`}</label>
                                        </div>}
                                        {(!inheritDefault || !inheritInstances || (inheritInstances && !inviterHasInstancesAssigned)) && <div className="mb-3">
                                            <label htmlFor="instancesDefault">
                                                Default Instance
                                            </label>
                                            <div className="invalid-feedback text-center" style={{ display: userHasNoDefaultAssigned ? "block" : "none" }}>
                                                No default instance is currently assigned to the user
                                            </div>
                                            <Select
                                                inputId="instancesDefault"
                                                isClearable={false}
                                                value={defaultInstance}
                                                isSearchable={true}
                                                onChange={selected => setDefaultInstance(selected)}
                                                options={inheritInstances ? instancesAllowed : selectedInstancesAllowed}
                                            />
                                        </div>}
                                    </>}
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
