import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const InstanceSubmissionForm = () => {
    const { label } = useParams();
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("")
    const [instanceLabel, setInstanceLabel] = useState("");
    const [cpuReq, setCpuReq] = useState("");
    const [memReq, setMemReq] = useState("");
    const [multiplier, setMultiplier] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [instanceUpdated, setInstanceUpdated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!label) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setErrorMsg("");
        axios.get(`${server}/usage/instances`)
            .then(res => {
                const instanceData = res.data.filter(el => el.label === label);
                if (instanceData.length > 0) {
                    setInstanceLabel(instanceData[0].label);
                    setCpuReq(instanceData[0].cpu_request);
                    setMemReq(instanceData[0].memory_request);
                    setMultiplier(instanceData[0].multiplier);
                    setIsLoading(false);
                } else {
                    setErrorMsg(`Instance: ${label} does not exist`);
                    setIsLoading(false);
                }
            })
            .catch(err => {
                setErrorMsg(`Problems while while retrieving instance data. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
            });
    }, [server, label]);

    const handleInstanceSubmission = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                label: instanceLabel,
                cpu_request: cpuReq,
                memory_request: memReq,
                multiplier: multiplier
            }
            if (label) {
                payload['old_label'] = label;
            }
            await axios({
                url: `${server}/usage/instances`,
                method: label ? "put" : "post",
                params: payload
            });
            setAlertMsg(`success:Instance ${label ? "updated" : "added"} successfully`);
            setInstanceUpdated(true);
        }
        catch (err) {
            setSubmissionErrorMsg(`Problems ${label ? "updating" : "adding"} instance. Error message: ${getResponseError(err)}`);
            setIsSubmitting(false);
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">{label ? `Update Instance: '${label}'` : "Add new Instance"}</h1>
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
                            <div className="form-group">
                                <label htmlFor="instanceLabel">
                                    Instance Label
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="instanceLabel"
                                    autoComplete="on"
                                    required
                                    value={instanceLabel}
                                    onChange={e => setInstanceLabel(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cpuReq">
                                    CPU (vCPU)
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="cpuReq"
                                    value={cpuReq}
                                    required
                                    onChange={e => setCpuReq(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="memReq">
                                    Memory (in MiB)
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="memReq"
                                    value={memReq}
                                    required
                                    onChange={e => setMemReq(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="multiplier">
                                    Multiplier
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="multiplier"
                                    value={multiplier}
                                    required
                                    onChange={e => setMultiplier(e.target.value)}
                                />
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                {label ? "Update Instance" : "Add Instance"}
                            </SubmitButton>
                        </div>
                        {instanceUpdated && <Redirect to="/instances" />}
                    </form>
                )}
        </div>
    );
}

export default InstanceSubmissionForm;
