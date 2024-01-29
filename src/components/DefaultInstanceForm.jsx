import React, { useState, useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Select from 'react-select';
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { formatInstancesSelectInput, getInstanceData, getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import { ClipLoader } from "react-spinners";

const DefaultInstanceForm = () => {
    const [{ username, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [instanceUpdated, setInstanceUpdated] = useState(false);

    const [currentDefaultInstance, setCurrentDefaultInstance] = useState(null);
    const [newDefaultInstance, setNewDefaultInstance] = useState(null);
    const [availableInstances, setAvailableInstances] = useState(null);

    useEffect(() => {
        const fetchInstanceData = async () => {
            const instanceData = await getInstanceData(server, username);
            const availableInstancesTmp = formatInstancesSelectInput(instanceData.instances);
            setAvailableInstances(availableInstancesTmp);
            let defaultInstance;
            if (instanceData.default == null) {
                defaultInstance = availableInstancesTmp[0]
            } else {
                defaultInstance = availableInstancesTmp.find(instance => instance.value === instanceData.default);
                setCurrentDefaultInstance(defaultInstance);
            }
            setNewDefaultInstance(defaultInstance);
        }
        fetchInstanceData()
    }, [server, username])

    const handleChangeDefaultInstance = () => {
        if (!availableInstances || availableInstances.length === 0) {
            return;
        }
        if (currentDefaultInstance != null && newDefaultInstance.value === currentDefaultInstance.value) {
            setAlertMsg("success:Default instance updated!");
            setInstanceUpdated(true);
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
                setInstanceUpdated(true);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Some error occurred while trying to update default instance. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Update Default Instance</h1>
            </div>
            {availableInstances == null ?
                <ClipLoader /> : (availableInstances.length === 0 ?
                    <>No instances available</> : <form
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
                            <div className="mb-3">
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
                                Update Instance
                            </SubmitButton>
                        </div>
                        {instanceUpdated && <Navigate to="/" />}
                    </form>)}
        </div>);
}

export default DefaultInstanceForm;
