import React, { useState, useContext, useEffect } from "react";
import Select from 'react-select';
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { formatInstancesSelectInput, getInstanceData, getResponseError } from "./util";
import { ClipLoader } from "react-spinners";
import { AlertContext } from "./Alert";

const DefaultInstanceSelector = ({ className }) => {
    const [{ username, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleChangeDefaultInstance = async (newDefaultInstance) => {
        if (!availableInstances || availableInstances.length === 0) {
            return;
        }
        if (currentDefaultInstance != null && newDefaultInstance.value === currentDefaultInstance.value) {
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.put(
                `${server}/usage/instances/${username}/default`,
                {
                    default_label: newDefaultInstance.value
                }
            );
            setNewDefaultInstance(newDefaultInstance);
        } catch (err) {
            setAlertMsg(`Some error occurred while trying to update default instance. Error message: ${getResponseError(err)}.`);
        }
        setIsSubmitting(false);
    }

    return (
        <>
            {availableInstances == null ?
                <ClipLoader /> : (availableInstances.length === 0 ?
                    <></> : <>
                        <fieldset disabled={isSubmitting}>
                            <div className={className}>
                                <label htmlFor="defaultInstance">
                                    Default instance
                                </label>
                                <div className="invalid-feedback" style={{ display: currentDefaultInstance === null ? "block" : "none" }}>
                                    You do not currently have a default instance assigned
                                </div>
                                <Select
                                    inputId="defaultInstance"
                                    isClearable={false}
                                    value={newDefaultInstance}
                                    isSearchable={true}
                                    onChange={selected => handleChangeDefaultInstance(selected)}
                                    options={availableInstances}
                                />
                            </div>
                        </fieldset></>)}
        </>);
}

export default DefaultInstanceSelector;
