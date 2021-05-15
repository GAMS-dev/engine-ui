import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
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
    const [instancesAllowed, setInstancesAllowed] = useState(null);
    const [selectedInstancesAllowed, setSelectedInstancesAllowed] = useState(null);
    const [defaultInstance, setDefaultInstance] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [instancesInfoMsg, setInstancesInfoMsg] = useState("");
    const [defaultInstanceInfoMsg, setDefaultInstanceInfoMsg] = useState("");

    const [userEdited, setUserEdited] = useState(false);
    const [userToEditIsAdmin, setUserToEditIsAdmin] = useState(false);

    useEffect(() => {
        const fetchRequiredData = async () => {
            let userToEditIsAdminTmp = false;
            try {
                if (roles && roles.includes("admin")) {
                    const resMe = await axios
                        .get(`${server}/usage/instances`);
                    if (resMe.status !== 200) {
                        setErrorMsg("An error occurred while retrieving user instances. Please try again later.");
                        return;
                    }
                    if (!resMe.data ||
                        resMe.data.length === 0) {
                        setErrorMsg("No instances available.");
                        setIsLoading(false);
                        return;
                    }
                    const instancesAllowedTmp = resMe.data
                        .map(instance => ({
                            "value": instance.label,
                            "label": instance.label
                        }));
                    setInstancesAllowed(instancesAllowedTmp);
                    const resUserInfo = await axios
                        .get(`${server}/users/`, {
                            params: {
                                username: userToEdit
                            },
                            headers: {
                                "X-Fields": "roles"
                            }
                        });
                    if (resUserInfo.status !== 200) {
                        setErrorMsg("An error occurred while retrieving user information. Please try again later.");
                        return;
                    }
                    if (!resUserInfo.data || resUserInfo.data.length === 0) {
                        setErrorMsg("User not found.");
                        setIsLoading(false);
                        return;
                    }
                    userToEditIsAdminTmp = resUserInfo.data[0].roles &&
                        resUserInfo.data[0].roles.includes("admin");
                    setUserToEditIsAdmin(userToEditIsAdminTmp);
                    if (userToEditIsAdminTmp) {
                        setSelectedInstancesAllowed(instancesAllowedTmp);
                    }
                } else {
                    const resMe = await axios
                        .get(`${server}/usage/instances/${encodeURIComponent(username)}`);
                    if (resMe.status !== 200) {
                        setErrorMsg("An error occurred while retrieving user instances. Please try again later.");
                        return;
                    }
                    if (!resMe.data ||
                        !resMe.data.instances_available ||
                        resMe.data.instances_available.length === 0) {
                        setErrorMsg("No instances available.");
                        setIsLoading(false);
                        return;
                    }
                    setInstancesAllowed(resMe.data.instances_available
                        .map(instance => ({
                            "value": instance.label,
                            "label": instance.label
                        })));
                }
                const resUser = await axios
                    .get(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`);
                if (resUser.status !== 200) {
                    setErrorMsg("An error occurred while retrieving user instances. Please try again later.");
                    return;
                }
                if (resUser.data) {
                    if (resUser.data.instances_available) {
                        const selectedInstances = resUser.data.instances_available
                            .map(instance => ({
                                "value": instance.label,
                                "label": instance.label
                            }));
                        if (resUser.data.instances_inherited_from != null &&
                            resUser.data.instances_inherited_from !== userToEdit) {
                            setInstancesInfoMsg(`Inherited from ${resUser.data.instances_inherited_from}`);
                            setInstancesAllowed(selectedInstances);
                        }
                        if (!userToEditIsAdminTmp) {
                            setSelectedInstancesAllowed(selectedInstances);
                        }
                    }
                    if (resUser.data.default_inherited_from != null &&
                        resUser.data.default_inherited_from !== userToEdit) {
                        setDefaultInstanceInfoMsg(`Inherited from ${resUser.data.default_inherited_from}`);
                    }
                    if (resUser.data.default_instance && resUser.data.default_instance.label) {
                        const defaultLabel = resUser.data.default_instance.label;
                        setDefaultInstance({ "value": defaultLabel, "label": defaultLabel });
                    } else {
                        setUseRawRequests(true);
                    }
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
    }, [server, jwt, roles, userToEdit, username]);

    const handleUserUpdateInstancesSubmission = async () => {
        setIsSubmitting(true);
        if (useRawRequests) {
            try {
                await axios.delete(`${server}/usage/instances/${encodeURIComponent(userToEdit)}`);
                setAlertMsg(`success:Instances of user: ${userToEdit} updated successfully`);
                setUserEdited(true);
            }
            catch (err) {
                setIsSubmitting(false);
                setSubmissionErrorMsg(`An error occurred while updating user instances. Error message: ${getResponseError(err)}.`);
            }
            return;
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
            if (!userToEditIsAdmin) {
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
                                {(useRawRequests || (roles && roles.includes("admin"))) &&
                                    <div className="form-check mb-3">
                                        <input type="checkbox" className="form-check-input" checked={useRawRequests} onChange={e => setUseRawRequests(e.target.checked)}
                                            id="useRawRequests" />
                                        <label className="form-check-label" htmlFor="useRawRequests">User is allowed to use raw resource requests</label>
                                    </div>}
                                {!useRawRequests &&
                                    <>
                                        {!userToEditIsAdmin &&
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
                                                    onChange={selected => {
                                                        setSelectedInstancesAllowed(selected);
                                                        if (!defaultInstance) {
                                                            setDefaultInstance(selected[0]);
                                                        }
                                                    }}
                                                    options={instancesAllowed}
                                                />
                                            </div>}
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
                                                options={selectedInstancesAllowed}
                                            />

                                        </div>
                                    </>}
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Update Instances
                                </SubmitButton>
                            </div>
                        </form>)}
                {userEdited && <Redirect to="/users" />}
            </div>
        </>
    );
}

export default UserInstanceUpdateForm;
