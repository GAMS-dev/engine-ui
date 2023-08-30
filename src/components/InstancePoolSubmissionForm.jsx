import React, { useState, useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import Select from 'react-select';
import { formatInstancesSelectInput, getInstanceData, getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const InstancePoolSubmissionForm = () => {
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server, username }] = useContext(AuthContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [formErrors, setFormErrors] = useState("");
    const [errorMsg, setErrorMsg] = useState("")
    const [poolLabel, setPoolLabel] = useState("");
    const [availableInstances, setAvailableInstances] = useState([]);
    const [instanceReq, setInstanceReq] = useState("");
    const [sizeReq, setSizeReq] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [poolUpdated, setPoolUpdated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchInstances = async () => {
            setIsLoading(true);
            setErrorMsg("");
            try {
                const instanceData = await getInstanceData(server, username);
                const instancePoolsTmp = formatInstancesSelectInput(instanceData.instances
                    .filter(el => el.is_pool !== true));
                setAvailableInstances(instancePoolsTmp);
                setInstanceReq(instancePoolsTmp[0]);
            }
            catch (err) {
                setErrorMsg(`An error occurred fetching instance pools. Error message: ${getResponseError(err)}.`);
            }
            setIsLoading(false);
        }
        fetchInstances();
    }, [server, username]);

    const handleInstanceSubmission = async () => {
        if (instanceReq == null) {
            setSubmissionErrorMsg('Please select an instance.');
            return;
        }
        setFormErrors({});
        setIsSubmitting(true);
        try {
            const payload = {
                label: poolLabel,
                instance: instanceReq.value,
                size: sizeReq
            }
            await axios.post(`${server}/usage/pools`, payload);
            setAlertMsg('success:Instance Pool added successfully');
            setPoolUpdated(true);
        }
        catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                const formErrorsTmp = {};
                ['label', 'instance', 'size'].forEach(key => {
                    if (err.response.data.errors.hasOwnProperty(key)) {
                        formErrorsTmp[key] = err.response.data.errors[key]
                    }
                });
                setFormErrors(formErrorsTmp);
                setSubmissionErrorMsg('Problems adding instance pool.');
            } else {
                setSubmissionErrorMsg(`Problems adding instance pool. Error message: ${getResponseError(err)}`);
            }
            setIsSubmitting(false);
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Add new Instance Pool</h1>
            </div>
            {errorMsg ?
                <div className="invalid-feedback text-center" style={{ display: "block" }}>
                    {errorMsg}
                </div> :
                (isLoading ? <ClipLoader /> :
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleInstanceSubmission();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="mb-3">
                                <label htmlFor="poolLabel">
                                    Pool Label
                                </label>
                                <input
                                    type="text"
                                    className={"form-control" + (formErrors.label ? " is-invalid" : "")}
                                    id="poolLabel"
                                    autoComplete="on"
                                    required
                                    value={poolLabel}
                                    onChange={e => setPoolLabel(e.target.value)}
                                />
                                <div className="invalid-feedback">
                                    {formErrors.label ? formErrors.label : ""}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="instanceReq">
                                    Instance
                                </label>
                                <Select
                                    id="instanceReq"
                                    isClearable={false}
                                    value={instanceReq}
                                    isSearchable={true}
                                    onChange={selected => setInstanceReq(selected)}
                                    options={availableInstances}
                                />
                                <div className="invalid-feedback">
                                    {formErrors.instance ? formErrors.instance : ""}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label htmlFor="sizeReq">
                                    Size
                                </label>
                                <input
                                    type="number"
                                    className={"form-control" + (formErrors.size ? " is-invalid" : "")}
                                    id="sizeReq"
                                    min="0"
                                    value={sizeReq}
                                    required
                                    onChange={e => setSizeReq(e.target.value)}
                                />
                                <div className="invalid-feedback">
                                    {formErrors.size ? formErrors.size : ""}
                                </div>
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Add Instance Pool
                            </SubmitButton>
                        </div>
                        {poolUpdated && <Navigate to="/pools" />}
                    </form>
                )}
        </div>
    );
}

export default InstancePoolSubmissionForm;
