import React, { useState, useContext, useEffect } from "react";
import { Redirect } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Collapse from "react-bootstrap/Collapse";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { zipAsync, getResponseError } from "./util";
import InexJSONSelector from "./InexJSONSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import { ServerInfoContext } from "../ServerInfoContext";

const JobSubmissionForm = props => {
    const { newHcJob } = props;
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [serverInfo,] = useContext(ServerInfoContext);

    const [isLoading, setIsLoading] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [useRegisteredModel, setUseRegisteredModel] = useState(false);
    const [registeredModelName, setRegisteredModelName] = useState("");
    const [openAdvancedOptions, setOpenAdvancedOptions] = useState(false);
    const [modelName, setModelName] = useState("");
    const [namespace, setNamespace] = useState("");
    const [availableNamespaces, setAvailableNamespaces] = useState([]);
    const [modelFiles, setModelFiles] = useState();
    const [modelData, setModelData] = useState();
    const [registeredModels, setRegisteredModels] = useState([]);
    const [clArgs, setClArgs] = useState("");
    const [logFileName, setLogFileName] = useState("");
    const [hcFile, setHcFile] = useState("")
    const [textEntries, setTextEntries] = useState("");
    const [streamEntries, setStreamEntries] = useState("");
    const [inexJSON, setInexJSON] = useState("");
    const [jobDeps, setJobDeps] = useState("");
    const [validCpuReq, setValidCpuReq] = useState(true);
    const [validMemReq, setValidMemReq] = useState(true);
    const [openLabelsWrapper, setOpenLabelsWrapper] = useState(false);
    const [instancesLoaded, setInstancesLoaded] = useState(false);
    const [availableInstances, setAvailableInstances] = useState([]);
    const [useRawRequests, setUseRawRequests] = useState(false);
    const [cpuReq, setCpuReq] = useState("");
    const [memReq, setMemReq] = useState("");
    const [instance, setInstance] = useState("");
    const [jobPosted, setJobPosted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        axios
            .get(`${server}/namespaces/permissions/me`)
            .then(res => {
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An error occurred while retrieving namespaces. Please try again later.");
                    return;
                }
                const availableNsTmp = res.data.filter(ns => (ns.permission & 1) === 1);
                if (availableNsTmp.length === 0) {
                    setSubmissionErrorMsg("You do not have permissions to execute models.");
                    setIsLoading(false);
                    return;
                }
                setAvailableNamespaces(availableNsTmp);
                setNamespace(availableNsTmp[0].name);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while retrieving namespaces. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
            });
    }, [server, jwt]);

    useEffect(() => {
        if (namespace !== "") {
            axios
                .get(`${server}/namespaces/${encodeURIComponent(namespace)}`)
                .then(res => {
                    if (res.status !== 200) {
                        setSubmissionErrorMsg("An error occurred while retrieving registered models. Please try again later.");
                        setIsLoading(false);
                        return;
                    }
                    if (res.data.length > 0) {
                        const modelsTmp = res.data.map(el => el.name);
                        setRegisteredModels(modelsTmp);
                        setRegisteredModelName(modelsTmp[0]);
                    } else {
                        setUseRegisteredModel(false);
                        setRegisteredModels([]);
                        setRegisteredModelName("");
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    setSubmissionErrorMsg(`Problems while retrieving registered models. Error message: ${getResponseError(err)}.`);
                    setIsLoading(false);
                });
        }
    }, [server, namespace]);

    useEffect(() => {
        if (submissionErrorMsg !== "") {
            setIsSubmitting(false);
        }
    }, [submissionErrorMsg])

    const handleJobSubmission = () => {
        if (!validCpuReq || !validMemReq) {
            return;
        }
        setSubmissionErrorMsg("");
        setIsSubmitting(true);
        const jobSubmissionForm = new FormData();
        jobSubmissionForm.append("namespace", namespace);
        const promisesToAwait = [];

        if (useRegisteredModel) {
            jobSubmissionForm.append("model", registeredModelName);
        } else {
            if (modelName.endsWith(".gms")) {
                jobSubmissionForm.append("model", modelName.slice(0, -4));
            } else {
                jobSubmissionForm.append("model", modelName);
                jobSubmissionForm.append("run", modelName);
            }
            if (modelFiles.length > 1 ||
                !modelFiles[0].name.toLowerCase().endsWith(".zip")) {
                // we need to zip uploaded files first
                try {
                    promisesToAwait.push(zipAsync(modelFiles).then(zipFile => {
                        jobSubmissionForm.append("model_data", zipFile, "model.zip");
                        return;
                    }));
                } catch (err) {
                    setSubmissionErrorMsg(err.message);
                    return;
                }
            } else {
                jobSubmissionForm.append("model_data", modelFiles[0], "model.zip");
            }
        }
        if (modelData) {
            if (modelData.length > 1 ||
                !modelData[0].name.toLowerCase().endsWith(".zip")) {
                // we need to zip uploaded files first
                try {
                    promisesToAwait.push(zipAsync(modelData).then(zipFile => {
                        jobSubmissionForm.append("data", zipFile, "data.zip");
                        return;
                    }));
                } catch (err) {
                    setSubmissionErrorMsg(err.message);
                    return;
                }
            } else {
                jobSubmissionForm.append("data", modelData[0], "data.zip");
            }
        }
        jobSubmissionForm.append("stdout_filename", logFileName ? logFileName : "log_stdout.txt");

        let optionalArgs = [{ key: "arguments", value: clArgs }, { key: "dep_tokens", value: jobDeps }];

        if (newHcJob) {
            if (!hcFile.name.toLowerCase().endsWith(".json")) {
                setSubmissionErrorMsg("Hypercube description must be a JSON file!");
                return;
            }
            jobSubmissionForm.append("hypercube_file", hcFile, "hc.json");
        } else {
            optionalArgs = optionalArgs.concat([{ key: "text_entries", value: textEntries },
            { key: "stream_entries", value: streamEntries }]);
        }

        optionalArgs.forEach(el => {
            if (el.value !== "") {
                const value = el.value.trim().split(",");
                for (let i = 0; i < value.length; i++) {
                    jobSubmissionForm.append(el.key, value[i].trim());
                }
            }
        });
        if (inexJSON !== "") {
            jobSubmissionForm.append("inex_file", new Blob([inexJSON],
                { type: "application/json" }), "inex.json");
        }
        if (serverInfo && serverInfo.in_kubernetes === true) {
            if (useRawRequests) {
                if (cpuReq) {
                    jobSubmissionForm.append('labels', `cpu_request=${cpuReq}`);
                }
                if (memReq) {
                    jobSubmissionForm.append('labels', `memory_request=${memReq}`);
                }
            } else if (instance) {
                jobSubmissionForm.append('labels', `instance=${instance}`);
            }
        }
        Promise.all(promisesToAwait).then(() => {
            axios
                .post(
                    newHcJob ? `${server}/hypercube/` : `${server}/jobs/`,
                    jobSubmissionForm,
                    {
                        "Content-Type": "multipart/form-data"
                    }
                )
                .then(res => {
                    if (res.status !== 201 || !("token" in res.data || "hypercube_token" in res.data)) {
                        setSubmissionErrorMsg("An error occurred while posting job. Please try again later.");
                        return;
                    }
                    setAlertMsg("success:Job successfully submitted!");
                    setIsSubmitting(false);
                    setJobPosted(true);
                })
                .catch(err => {
                    setSubmissionErrorMsg(`Problems posting job. Error message: ${getResponseError(err)}.`);
                });
        })
            .catch(err => {
                setSubmissionErrorMsg(`Problems posting job.`);
            });
    }
    const loadInstanceData = async () => {
        if (openLabelsWrapper) {
            setOpenLabelsWrapper(false);
            return;
        }
        setOpenLabelsWrapper(true);
        try {
            const instanceData = await axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
            if (roles && roles.includes("admin")) {
                // admins can see/use all instances
                const availableInstancesTmp = await axios.get(`${server}/usage/instances`);
                if (availableInstancesTmp.data && availableInstancesTmp.data.length > 0) {
                    setAvailableInstances(availableInstancesTmp.data);
                    if (instanceData.data.default_instance.label != null) {
                        setInstance(instanceData.data.default_instance.label);
                    } else {
                        setInstance(availableInstancesTmp.data[0].label);
                    }
                    setUseRawRequests(false);
                } else {
                    setUseRawRequests(true);
                }
            } else if (instanceData.data && instanceData.data.instances_available.length > 0) {
                setAvailableInstances(instanceData.data.instances_available);
                setInstance(instanceData.data.default_instance.label);
                setUseRawRequests(false);
            } else {
                setUseRawRequests(true);
            }
            setInstancesLoaded(true);
        }
        catch (err) {
            setSubmissionErrorMsg(`An error occurred fetching instances. Error message: ${getResponseError(err)}.`);
            return;
        }
    }
    const updateModelFiles = e => {
        if (modelName === "" || modelName === modelFiles[0].name.split(".")[0]) {
            setModelName(`${e.target.files[0].name.split(".")[0]}.gms`);
        }
        setModelFiles([...e.target.files]);
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Submit new {newHcJob && 'Hypercube '}Job</h1>
            </div>
            {isLoading ? <ClipLoader /> :
                (availableNamespaces.length > 0 ?
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleJobSubmission();
                            return false;
                        }}
                    >
                        <div className="row">
                            <div className="col-md-6 col-12">
                                <fieldset disabled={isSubmitting}>
                                    <div className="form-group">
                                        <label htmlFor="namespace">
                                            Select a Namespace
                                        </label>
                                        <select id="namespace" className="form-control" value={namespace} onChange={e => setNamespace(e.target.value)}>
                                            {availableNamespaces.map(ns => <option key={ns.name} value={ns.name}>{ns.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-check mb-3">
                                        <input type="checkbox" className="form-check-input" checked={useRegisteredModel} onChange={e => setUseRegisteredModel(e.target.checked)}
                                            id="useRegisteredModel" disabled={registeredModels.length === 0} />
                                        <label className="form-check-label" htmlFor="useRegisteredModel">Use a Registered Model?</label>
                                    </div>
                                    {useRegisteredModel && registeredModels.length !== 0 ?
                                        <div className="form-group">
                                            <label htmlFor="registeredModelName">
                                                Select a Model
                                    </label>
                                            <select id="registeredModelName" className="form-control" value={registeredModelName} onChange={e => setRegisteredModelName(e.target.value)}>
                                                {registeredModels.map(model => <option key={model} value={model}>{model}</option>)}
                                            </select>
                                        </div> :
                                        <React.Fragment>
                                            <div className="form-group">
                                                <div className="custom-file">
                                                    <input type="file" className="custom-file-input"
                                                        id="modelFiles"
                                                        multiple
                                                        onChange={updateModelFiles}
                                                        required
                                                    />
                                                    <label className="custom-file-label" htmlFor="modelFiles">
                                                        {modelFiles ?
                                                            `${modelFiles[0].name}${modelFiles.length > 1 ? ", ..." : ""}`
                                                            : "Model files..."}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="modelName" className="sr-only">
                                                    Name of the Main File
                                        </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="modelName"
                                                    placeholder="Name of the main file"
                                                    autoComplete="on"
                                                    value={modelName}
                                                    onChange={e => setModelName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </React.Fragment>
                                    }
                                    <div className="form-group">
                                        <div className="custom-file">
                                            <input type="file" className="custom-file-input"
                                                id="modelData"
                                                multiple
                                                onChange={e => setModelData([...e.target.files])} />
                                            <label className="custom-file-label" htmlFor="modelData">
                                                {modelData ?
                                                    `${modelData[0].name}${modelData.length > 1 ? ", ..." : ""}`
                                                    : `Data files${useRegisteredModel &&
                                                        registeredModels.length !== 0 ? "" : "(optional)"}...`}
                                            </label>
                                        </div>
                                    </div>
                                    {newHcJob &&
                                        <div className="form-group">
                                            <div className="custom-file">
                                                <input type="file" className="custom-file-input"
                                                    id="hcFile"
                                                    accept="application/JSON"
                                                    onChange={e => setHcFile(e.target.files[0])}
                                                    required
                                                />
                                                <label className="custom-file-label" htmlFor="modelFiles">
                                                    {hcFile ? hcFile.name : "Hypercube description file..."}
                                                </label>
                                            </div>
                                        </div>}
                                </fieldset>
                            </div>
                            <div className="col-md-6 col-12">
                                <fieldset disabled={isSubmitting}>
                                    <Button
                                        variant="link"
                                        onClick={() => setOpenAdvancedOptions(!openAdvancedOptions)}
                                        aria-expanded={openAdvancedOptions}
                                    >
                                        Advanced Options
                                    </Button>
                                    <Collapse in={openAdvancedOptions}>
                                        <div>
                                            <div className="form-group">
                                                <label htmlFor="clArgs" className="sr-only">
                                                    Command Line Arguments (comma-separated)
                                        </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="clArgs"
                                                    placeholder="Command line arguments (comma-separated, optional)"
                                                    autoComplete="on"
                                                    value={clArgs}
                                                    onChange={e => setClArgs(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label htmlFor="logFileName" className="sr-only">
                                                    Log Filename
                                        </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="logFileName"
                                                    placeholder="Log file name (optional)"
                                                    autoComplete="on"
                                                    value={logFileName}
                                                    onChange={e => setLogFileName(e.target.value)}
                                                />
                                            </div>
                                            {!newHcJob &&
                                                <>
                                                    <div className="form-group">
                                                        <label htmlFor="textEntries" className="sr-only">
                                                            Text Entries (comma-separated)
                                                    </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            id="textEntries"
                                                            placeholder="Text entries (comma-separated, optional)"
                                                            autoComplete="on"
                                                            value={textEntries}
                                                            onChange={e => setTextEntries(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label htmlFor="streamEntries" className="sr-only">
                                                            Stream Entries (comma-separated)
                                                    </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            id="streamEntries"
                                                            placeholder="Stream entries (comma-separated, optional)"
                                                            autoComplete="on"
                                                            value={streamEntries}
                                                            onChange={e => setStreamEntries(e.target.value)}
                                                        />
                                                    </div>
                                                </>
                                            }
                                            <div className="form-group">
                                                <label htmlFor="jobDeps" className="sr-only">
                                                    Job Dependencies
                                        </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="jobDeps"
                                                    placeholder="Job dependencies"
                                                    autoComplete="on"
                                                    value={jobDeps}
                                                    onChange={e => setJobDeps(e.target.value)}
                                                />
                                            </div>
                                            <InexJSONSelector onChangeHandler={e => setInexJSON(e)} />
                                            {serverInfo && serverInfo.in_kubernetes === true &&
                                                <>
                                                    <Button
                                                        variant="link"
                                                        onClick={loadInstanceData}
                                                        aria-expanded={openLabelsWrapper}
                                                        aria-controls="labelsWrapperContent"
                                                    >
                                                        Resources
                                                    </Button>
                                                    <Collapse in={openLabelsWrapper}>
                                                        <div id="labelsWrapperContent">
                                                            <ClipLoader loading={!instancesLoaded} />
                                                            {instancesLoaded && availableInstances.length > 0 &&
                                                                roles && roles.includes("admin") &&
                                                                <div className="form-check mb-3">
                                                                    <input type="checkbox" className="form-check-input" checked={useRawRequests} onChange={e => setUseRawRequests(e.target.checked)}
                                                                        id="useRawRequests" />
                                                                    <label className="form-check-label" htmlFor="useRawRequests">Use raw resource requests?</label>
                                                                </div>}
                                                            <div style={{
                                                                display: !useRawRequests ? "block" : "none"
                                                            }}>
                                                                <div className="form-group">
                                                                    <label htmlFor="instance">
                                                                        Select Instance
                                                                    </label>
                                                                    <select id="instance" className="form-control" value={instance} onChange={e => setInstance(e.target.value)}>
                                                                        {availableInstances.map(instance =>
                                                                            <option key={instance.label} value={instance.label}>
                                                                                {`${instance.label} (${instance.cpu_request} vCPU, ${instance.memory_request} MiB)`}
                                                                            </option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                display: useRawRequests ? "block" : "none"
                                                            }}>
                                                                <div className="form-group">
                                                                    <label htmlFor="cpuReq">
                                                                        Required CPU Units (vCPU/Core, Hyperthread)
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control${validCpuReq ? '' : ' is-invalid'}`}
                                                                        id="cpuReq"
                                                                        value={cpuReq}
                                                                        onChange={e => {
                                                                            if (!e.target.value) {
                                                                                setValidCpuReq(true);
                                                                                setCpuReq(null);
                                                                                return;
                                                                            }
                                                                            const val = parseFloat(e.target.value);
                                                                            if (isNaN(val) || !isFinite(val)) {
                                                                                setValidCpuReq(false);
                                                                                setCpuReq(val);
                                                                                return;
                                                                            }
                                                                            setValidCpuReq(true);
                                                                            setCpuReq(val);
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label htmlFor="memReq">
                                                                        Required Memory Units (MiB)
                                                                </label>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control${validMemReq ? '' : ' is-invalid'}`}
                                                                        id="memReq"
                                                                        value={memReq}
                                                                        onChange={e => {
                                                                            if (!e.target.value) {
                                                                                setValidMemReq(true);
                                                                                setMemReq(null);
                                                                                return;
                                                                            }
                                                                            const val = parseFloat(e.target.value);
                                                                            if (isNaN(val) || !isFinite(val)) {
                                                                                setValidMemReq(false);
                                                                                setMemReq(val);
                                                                                return;
                                                                            }
                                                                            setValidMemReq(true);
                                                                            setMemReq(val);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Collapse>
                                                </>}
                                        </div>
                                    </Collapse>
                                </fieldset>
                            </div>
                        </div>
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Submit Job
                            </SubmitButton>
                        </div>
                        {jobPosted && <Redirect to="/" />}
                    </form>
                    :
                    <div className="alert alert-danger">
                        <p><strong>You have no write access to any namespace.</strong></p>
                        <p>Ask an administrator to grant you permission to submit jobs and try again.</p>
                    </div>)
            }
        </div>
    );
}

export default JobSubmissionForm;
