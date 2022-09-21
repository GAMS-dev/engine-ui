import React, { useState, useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Select from 'react-select';
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import { ClipLoader } from "react-spinners";

const PreferencesForm = () => {
    const [{ username, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [preferencesUpdated, setPreferencesUpdated] = useState(false);

    const [currentDefaultInstance, setCurrentDefaultInstance] = useState(null);
    const [newDefaultInstance, setNewDefaultInstance] = useState(null);
    const [availableInstances, setAvailableInstances] = useState(null);

    useEffect(() => {
        const fetchInstanceData = async () => {
            const instanceData = await axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
            if (instanceData.data && instanceData.data.instances_available.length > 0) {
                const availableInstancesTmp = instanceData.data.instances_available
                    .map(instance => ({ value: instance.label, label: `${instance.label} (${instance.cpu_request} vCPU, ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(instance.memory_request)} MiB RAM, ${instance.multiplier}x)` }));
                setAvailableInstances(availableInstancesTmp.sort((a, b) => ('' + a.label).localeCompare(b.label)));
                const currentDefault = availableInstancesTmp.find(instance => instance.value === instanceData.data.default_instance.label);
                setCurrentDefaultInstance(currentDefault);
                setNewDefaultInstance(currentDefault);
                return;
            }
            let availableInstancesTmp = await axios.get(`${server}/usage/instances`);
            if (availableInstancesTmp.data && availableInstancesTmp.data.length > 0) {
                availableInstancesTmp = availableInstancesTmp.data
                    .map(instance => ({ value: instance.label, label: `${instance.label} (${instance.cpu_request} vCPU, ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(instance.memory_request)} MiB RAM, ${instance.multiplier}x)` }));
                setAvailableInstances(availableInstancesTmp.sort((a, b) => ('' + a.label).localeCompare(b.label)));
                if (instanceData.data.default_instance != null &&
                    instanceData.data.default_instance.label != null) {
                    const currentDefault = availableInstancesTmp.find(instance => instance.value === instanceData.data.default_instance.label);
                    setCurrentDefaultInstance(currentDefault);
                    setNewDefaultInstance(currentDefault);
                } else {
                    const currentDefault = availableInstancesTmp[0];
                    setNewDefaultInstance(currentDefault);
                }
            } else {
                setAvailableInstances([]);
            }
        }
        fetchInstanceData()
    }, [server, username])

    const handleChangeDefaultInstance = () => {
        if (!availableInstances || availableInstances.length === 0) {
            return;
        }
        if (currentDefaultInstance != null && newDefaultInstance.value === currentDefaultInstance.value) {
            setAlertMsg("success:Default instance updated!");
            setPreferencesUpdated(true);
            return;
        }
        setIsSubmitting(true);
        axios
            .put(
                `${server}/usage/instances/${username}/default`,
                {
                    default_label: newDefaultInstance.value
                }
            )
            .then(() => {
                setIsSubmitting(false);
                setAlertMsg("success:Default instance updated!");
                setPreferencesUpdated(true);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Some error occurred while trying to update default instance. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Update Preferences</h1>
            </div>
            {availableInstances == null ?
                <ClipLoader /> : (availableInstances.length === 0 ?
                    <>No preferences available</> : <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleChangeDefaultInstance();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor="defaultInstance">
                                    Default instance
                                </label>
                                <div className="invalid-feedback" style={{ display: currentDefaultInstance === null ? "block" : "none" }}>
                                    You do not currently have a default instance assigned
                                </div>
                                <Select
                                    id="defaultInstance"
                                    isClearable={false}
                                    value={newDefaultInstance}
                                    isSearchable={true}
                                    onChange={selected => setNewDefaultInstance(selected)}
                                    options={availableInstances}
                                />
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Update Preferences
                            </SubmitButton>
                        </div>
                        {preferencesUpdated && <Navigate to="/" />}
                    </form>)}
        </div>);
}

export default PreferencesForm;
