import React, { useState, useContext, useEffect, useCallback } from "react";
import Select from 'react-select';
import { Navigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Collapse from "react-bootstrap/Collapse";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { zipAsync, getResponseError, getInstanceData, formatInstancesSelectInput } from "./util";
import JobAccessGroupsSelector from "./JobAccessGroupsSelector";
import InexJSONSelector from "./InexJSONSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import { ServerInfoContext } from "../ServerInfoContext";
import FileDropZone from "./FileDropZone";

const JobSubmissionForm = props => {
    const { newHcJob } = props;
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [serverInfo,] = useContext(ServerInfoContext);

    const [isLoading, setIsLoading] = useState(true);
    const [unableToSolve, setUnableToSolve] = useState(null);
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
    const [jobTag, setJobTag] = useState("");
    const [validCpuReq, setValidCpuReq] = useState(true);
    const [validMemReq, setValidMemReq] = useState(true);
    const [validWsReq, setValidWsReq] = useState(true);
    const [instancesLoaded, setInstancesLoaded] = useState(false);
    const [availableInstances, setAvailableInstances] = useState([]);
    const [rawResourceRequestsAllowed, setRawResourceRequestsAllowed] = useState(false);
    const [useRawRequests, setUseRawRequests] = useState(false);
    const [cpuReq, setCpuReq] = useState("");
    const [wsReq, setWsReq] = useState("");
    const [memReq, setMemReq] = useState("");
    const [tolerations, setTolerations] = useState("");
    const [nodeSelectors, setNodeSelectors] = useState("");
    const [instance, setInstance] = useState("");
    const [jobPosted, setJobPosted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accessGroups, setAccessGroups] = useState([]);

    useEffect(() => {
        axios
            .get(`${server}/namespaces/`, {
                headers: { "X-Fields": "name,permissions" }
            })
            .then(res => {
                if (res.status !== 200) {
                    setSubmissionErrorMsg("An error occurred while retrieving namespaces. Please try again later.");
                    return;
                }
                const availableNsTmp = res.data
                    .filter(ns => roles && roles.includes("admin") ? true : ns.permissions
                        .filter(perm => (perm.username === username && (perm.permission & 1) === 1)).length > 0)
                    .map(ns => ns.name);
                if (availableNsTmp.length === 0) {
                    setSubmissionErrorMsg("You do not have permissions to execute models.");
                    setUnableToSolve(<><p><strong>You have no execute access to any namespace.</strong></p>
                        <p>Ask your inviter to grant you permission to submit jobs and try again.</p></>);
                    setIsLoading(false);
                    return;
                }
                setAvailableNamespaces(availableNsTmp);
                setNamespace(availableNsTmp[0]);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while retrieving namespaces. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
            });
    }, [server, jwt, roles, username]);

    useEffect(() => {
        const loadNamespaceData = async () => {
            if (namespace === "") {
                return;
            }
            try {
                const namespaceData = await axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}`);
                if (namespaceData.data.length > 0) {
                    const modelsTmp = namespaceData.data.map(el => el.name);
                    setRegisteredModels(modelsTmp);
                    setRegisteredModelName(modelsTmp[0]);
                } else {
                    setUseRegisteredModel(false);
                    setRegisteredModels([]);
                    setRegisteredModelName("");
                }
            } catch (err) {
                setSubmissionErrorMsg(`Problems while retrieving registered models. Error message: ${getResponseError(err)}.`);
                return;
            }
            setIsLoading(false);
        }
        loadNamespaceData();
    }, [server, namespace]);

    useEffect(() => {
        const loadInstanceData = async () => {
            if (serverInfo == null || serverInfo.in_kubernetes !== true || instancesLoaded === true) {
                return;
            }
            try {
                const instanceData = await getInstanceData(server, username);
                const availableInstancesTmp = formatInstancesSelectInput(instanceData.instances);
                setAvailableInstances(availableInstancesTmp);
                setRawResourceRequestsAllowed(instanceData.rawResourceRequestsAllowed);
                setUseRawRequests(instanceData.rawResourceRequestsAllowed && availableInstancesTmp.length === 0);
                if (availableInstancesTmp.length === 0 && !instanceData.rawResourceRequestsAllowed) {
                    setUnableToSolve(<><p><strong>You have no instances assigned to you.</strong></p>
                        <p>Ask your inviter to give you access to instances.</p></>);
                } else {
                    let defaultInstance;
                    if (instanceData.default == null) {
                        defaultInstance = availableInstancesTmp[0]
                    } else {
                        defaultInstance = availableInstancesTmp.find(instance => instance.value === instanceData.default)
                    }
                    setInstance(defaultInstance);
                }
                setInstancesLoaded(true);
            }
            catch (err) {
                setSubmissionErrorMsg(`An error occurred fetching instances. Error message: ${getResponseError(err)}.`);
                return;
            }
        }
        loadInstanceData();
    }, [server, serverInfo, username, instancesLoaded]);

    useEffect(() => {
        if (submissionErrorMsg !== "") {
            setIsSubmitting(false);
        }
    }, [submissionErrorMsg]);

    const handleJobSubmission = () => {
        if (!validCpuReq || !validMemReq || !validWsReq) {
            return;
        }
        if (!useRegisteredModel && modelFiles == null) {
            setSubmissionErrorMsg("Please provide model files.");
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
        if (jobTag) {
            jobSubmissionForm.append('tag', jobTag);
        }
        jobSubmissionForm.append("stdout_filename", logFileName ? logFileName : "log_stdout.txt");

        let optionalArgs = [{ key: "arguments", value: clArgs }, { key: "dep_tokens", value: jobDeps },
        ...accessGroups.map(el => ({ key: "access_groups", value: el.label }))];

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
            jobSubmissionForm.append("inex_string", inexJSON);
        }
        if (serverInfo && serverInfo.in_kubernetes === true) {
            if (useRawRequests) {
                if (cpuReq) {
                    jobSubmissionForm.append('labels', `cpu_request=${cpuReq}`);
                }
                if (memReq) {
                    jobSubmissionForm.append('labels', `memory_request=${memReq}`);
                }
                if (wsReq) {
                    jobSubmissionForm.append('labels', `workspace_request=${wsReq}`);
                }
                if (tolerations) {
                    const tolerationsTmp = tolerations.split(',');
                    if (tolerationsTmp.length) {
                        tolerationsTmp.forEach(toleration => {
                            jobSubmissionForm.append('labels', `tolerations=${toleration}`);
                        });
                    }
                }
                if (nodeSelectors) {
                    const nodeSelectorsTmp = nodeSelectors.split(',');
                    if (nodeSelectorsTmp.length) {
                        nodeSelectorsTmp.forEach(nodeSelector => {
                            jobSubmissionForm.append('labels', `node_selectors=${nodeSelector}`);
                        });
                    }
                }
            } else if (instance && instance.value) {
                jobSubmissionForm.append('labels', `instance=${instance.value}`);
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
    const updateModelFiles = useCallback(acceptedFiles => {
        if (modelName === "") {
            setModelName(`${acceptedFiles[0].name.split(".")[0]}.gms`);
        }
        setModelFiles([...acceptedFiles]);
    }, [modelName]);

    const updateDataFiles = useCallback(acceptedFiles => {
        setModelData([...acceptedFiles])
    }, []);
    const updateHcFile = useCallback(acceptedFiles => {
        setHcFile([...acceptedFiles][0])
    }, []);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Submit new {newHcJob && 'Hypercube '}Job</h1>
            </div>
            {isLoading ? <ClipLoader /> :
                (unableToSolve == null ?
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
                                    {serverInfo && serverInfo.in_kubernetes === true &&
                                        <div id="labelsWrapperContent">
                                            <ClipLoader loading={!instancesLoaded} />
                                            {instancesLoaded && rawResourceRequestsAllowed &&
                                                <div className="form-check mb-3">
                                                    <input type="checkbox" className="form-check-input" checked={useRawRequests} onChange={e => setUseRawRequests(e.target.checked)}
                                                        id="useRawRequests" />
                                                    <label className="form-check-label" htmlFor="useRawRequests">Use raw resource requests?</label>
                                                </div>}
                                            <div style={{
                                                display: !useRawRequests ? "block" : "none"
                                            }}>
                                                <div className="mb-3">
                                                    <label htmlFor="instance">
                                                        Select Instance
                                                    </label>
                                                    <Select
                                                        inputId="instance"
                                                        isClearable={false}
                                                        value={instance}
                                                        isSearchable={true}
                                                        onChange={selected => setInstance(selected)}
                                                        options={availableInstances}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{
                                                display: useRawRequests ? "block" : "none"
                                            }}>
                                                <div className="mb-3">
                                                    <label htmlFor="cpuReq">
                                                        Required CPU Units (vCPU/Core, Hyperthread)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className={`form-control${validCpuReq ? '' : ' is-invalid'}`}
                                                        id="cpuReq"
                                                        step="any"
                                                        min="0"
                                                        value={cpuReq}
                                                        onChange={e => {
                                                            if (!e.target.value) {
                                                                setValidCpuReq(true);
                                                                setCpuReq("");
                                                                return;
                                                            }
                                                            const val = parseFloat(e.target.value);
                                                            if (isNaN(val) || !isFinite(val)) {
                                                                setValidCpuReq(false);
                                                                setCpuReq(e.target.value);
                                                                return;
                                                            }
                                                            setValidCpuReq(true);
                                                            setCpuReq(val);
                                                        }}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label htmlFor="memReq">
                                                        Required Memory Units (MiB)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className={`form-control${validMemReq ? '' : ' is-invalid'}`}
                                                        id="memReq"
                                                        min="0"
                                                        value={memReq}
                                                        onChange={e => {
                                                            if (!e.target.value) {
                                                                setValidMemReq(true);
                                                                setMemReq("");
                                                                return;
                                                            }
                                                            const val = parseFloat(e.target.value);
                                                            if (isNaN(val) || !isFinite(val)) {
                                                                setValidMemReq(false);
                                                                setMemReq(e.target.value);
                                                                return;
                                                            }
                                                            setValidMemReq(true);
                                                            setMemReq(val);
                                                        }}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label htmlFor="wsReq">
                                                        Required Workspace Size (MiB)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className={`form-control${validWsReq ? '' : ' is-invalid'}`}
                                                        id="wsReq"
                                                        min="0"
                                                        value={wsReq}
                                                        onChange={e => {
                                                            if (!e.target.value) {
                                                                setValidWsReq(true);
                                                                setWsReq("");
                                                                return;
                                                            }
                                                            const val = parseFloat(e.target.value);
                                                            if (isNaN(val) || !isFinite(val)) {
                                                                setValidWsReq(false);
                                                                setWsReq(e.target.value);
                                                                return;
                                                            }
                                                            setValidWsReq(true);
                                                            setWsReq(val);
                                                        }}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label htmlFor="tolerations">
                                                        Tolerations (comma-separated)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        id="tolerations"
                                                        autoComplete="on"
                                                        value={tolerations}
                                                        onChange={e => setTolerations(e.target.value)}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label htmlFor="nodeSelectors">
                                                        Node Selectors (comma-separated)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        id="nodeSelectors"
                                                        autoComplete="on"
                                                        value={nodeSelectors}
                                                        onChange={e => setNodeSelectors(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>}
                                    <div className="mb-3">
                                        <label htmlFor="namespace">
                                            Select a Namespace
                                        </label>
                                        <Select
                                            inputId="namespace"
                                            isClearable={false}
                                            value={{ value: namespace, label: namespace }}
                                            isSearchable={true}
                                            onChange={selected => setNamespace(selected.value)}
                                            options={availableNamespaces
                                                .map(ns => ({ value: ns, label: ns }))}
                                        />
                                    </div>
                                    <div className="form-check mb-3">
                                        <input type="checkbox" className="form-check-input" checked={useRegisteredModel} onChange={e => setUseRegisteredModel(e.target.checked)}
                                            id="useRegisteredModel" disabled={registeredModels.length === 0} />
                                        <label className="form-check-label" htmlFor="useRegisteredModel">Use a Registered Model?</label>
                                    </div>
                                    {useRegisteredModel && registeredModels.length !== 0 ?
                                        <div className="mb-3">
                                            <label htmlFor="registeredModelName">
                                                Select a Model
                                            </label>
                                            <Select
                                                inputId="registeredModelName"
                                                isClearable={false}
                                                value={{ value: registeredModelName, label: registeredModelName }}
                                                isSearchable={true}
                                                onChange={selected => setRegisteredModelName(selected.value)}
                                                options={registeredModels.map(model => ({ value: model, label: model }))
                                                    .sort((a, b) => ('' + a.label).localeCompare(b.label))}
                                            />
                                        </div> :
                                        <React.Fragment>
                                            <div className="mb-3">
                                                <FileDropZone
                                                    label="Drop static model files here"
                                                    onDrop={updateModelFiles} />
                                            </div>
                                            <div className="mb-3">
                                                <label htmlFor="modelName" className="visually-hidden">
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
                                    <div className="mb-3">
                                        <FileDropZone
                                            label="Drop data files here (optional)"
                                            onDrop={updateDataFiles} />
                                    </div>
                                    {newHcJob &&
                                        <div className="mb-3">
                                            <FileDropZone
                                                label="Drop Hypercube description file here"
                                                onDrop={updateHcFile} multiple={false} />
                                        </div>}
                                </fieldset>
                            </div>
                            <div className="col-md-6 col-12">
                                <fieldset disabled={isSubmitting}>
                                    <Button
                                        variant="link"
                                        onClick={() => setOpenAdvancedOptions(prevState => !prevState)}
                                        aria-expanded={openAdvancedOptions}
                                    >
                                        Advanced Options
                                    </Button>
                                    <Collapse in={openAdvancedOptions}>
                                        <div>
                                            <div className="mb-3">
                                                <label htmlFor="clArgs" className="visually-hidden">
                                                    Command Line Arguments (comma-separated, optional)
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
                                            <div className="mb-3">
                                                <label htmlFor="jobTag" className="visually-hidden">
                                                    Job tag (human-readable identifier, optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    id="jobTag"
                                                    placeholder="Job tag (human-readable identifier, optional)"
                                                    autoComplete="on"
                                                    value={jobTag}
                                                    onChange={e => setJobTag(e.target.value)}
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label htmlFor="logFileName" className="visually-hidden">
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
                                                    <div className="mb-3">
                                                        <label htmlFor="textEntries" className="visually-hidden">
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
                                                    <div className="mb-3">
                                                        <label htmlFor="streamEntries" className="visually-hidden">
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
                                            <div className="mb-3">
                                                <label htmlFor="jobDeps" className="visually-hidden">
                                                    Job Dependencies (comma-separated list of tokens, optional)
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
                                            <JobAccessGroupsSelector namespace={namespace} value={accessGroups} onChange={setAccessGroups} hideIfNoGroupsAvailable={true} />
                                            <InexJSONSelector onChangeHandler={e => setInexJSON(e)} />
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
                        {jobPosted && <Navigate to={newHcJob ? "/hc" : "/jobs"} />}
                    </form>
                    :
                    <div className="alert alert-danger">
                        {unableToSolve}
                    </div>)
            }
        </div>
    );
}

export default JobSubmissionForm;
