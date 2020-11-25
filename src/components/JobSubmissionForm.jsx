import React, { useState, useContext, useEffect } from "react";
import { Redirect } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Collapse from "react-bootstrap/Collapse";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { zipAsync } from "./util";
import InexJSONSelector from "./InexJSONSelector";
import SubmitButton from "./SubmitButton";

const JobSubmissionForm = props => {
    const { newHcJob } = props;
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server }] = useContext(AuthContext);

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
    const [validCpuReq, setValidCpuReq] = useState(true);
    const [validMemReq, setValidMemReq] = useState(true);
    const [cpuReq, setCpuReq] = useState(null);
    const [memReq, setMemReq] = useState(null);
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
                    return;
                }
                setAvailableNamespaces(availableNsTmp);
                setNamespace(availableNsTmp[0].name);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while retrieving namespaces. Error message: ${err.message}.`);
            });
    }, [server, jwt]);

    useEffect(() => {
        if (namespace !== "") {
            axios
                .get(`${server}/namespaces/${namespace}`)
                .then(res => {
                    if (res.status !== 200) {
                        setSubmissionErrorMsg("An error occurred while retrieving registered models. Please try again later.");
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
                })
                .catch(err => {
                    setSubmissionErrorMsg(`Problems while retrieving registered models. Error message: ${err.message}.`);
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

        let optionalArgs = [{ key: "arguments", value: clArgs }];

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
        if (cpuReq) {
            jobSubmissionForm.append('label', `cpu=${cpuReq}`);
        }
        if (memReq) {
            jobSubmissionForm.append('label', `memory=${memReq}`);
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
                    setSubmissionErrorMsg(`Problems while posting job. Error message: ${err.response.data.message}.`);
                });
        })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while posting job.`);
            });
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
                <h1 className="h2">Submit new {newHcJob && 'Hypercube '}job</h1>
            </div>
            {availableNamespaces.length > 0 ?
                <form
                    className="m-auto"
                    onSubmit={e => {
                        e.preventDefault();
                        handleJobSubmission();
                        return false;
                    }}
                >
                    <div className="row">
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <div className="col-md-6 col-12">
                            <fieldset disabled={isSubmitting}>
                                <div className="form-group">
                                    <label htmlFor="namespace">
                                        Select a namespace
                                </label>
                                    <select id="namespace" className="form-control" value={namespace} onChange={e => setNamespace(e.target.value)}>
                                        {availableNamespaces.map(ns => <option key={ns.name} value={ns.name}>{ns.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-check mb-3">
                                    <input type="checkbox" className="form-check-input" checked={useRegisteredModel} onChange={e => setUseRegisteredModel(e.target.checked)}
                                        id="useRegisteredModel" disabled={registeredModels.length === 0} />
                                    <label className="form-check-label" htmlFor="useRegisteredModel">Use a registered model?</label>
                                </div>
                                {useRegisteredModel && registeredModels.length !== 0 ?
                                    <div className="form-group">
                                        <label htmlFor="registeredModelName">
                                            Select a model
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
                                                Name of the main file
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
                                                {hcFile ? hcFile.name : "JSON file with job description..."}
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
                                    aria-controls="example-collapse-text"
                                    aria-expanded={openAdvancedOptions}
                                >
                                    Advanced options
                            </Button>
                                <Collapse in={openAdvancedOptions}>
                                    <div>
                                        <div className="form-group">
                                            <label htmlFor="clArgs" className="sr-only">
                                                Command line arguments (comma-separated)
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
                                                Log filename
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
                                                        Text entries (comma-separated)
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
                                                        Stream entries (comma-separated)
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
                                        <InexJSONSelector onChangeHandler={e => setInexJSON(e)} />
                                        {process.env.REACT_APP_K8_BUILD === "true" &&
                                            <>
                                                <div className="form-group">
                                                    <label htmlFor="cpuReq">
                                                        Required CPU units (vCPU/Core, Hyperthread)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className={`form-control${validCpuReq ? '' : ' is-invalid'}`}
                                                        id="cpuReq"
                                                        value={cpuReq}
                                                        onChange={e => {
                                                            if (!e.target.value) {
                                                                setValidCpuReq(true)
                                                                setCpuReq(null)
                                                                return;
                                                            }
                                                            const val = parseFloat(e.target.value);
                                                            if (isNaN(val)) {
                                                                setValidCpuReq(false)
                                                                return;
                                                            }
                                                            setValidCpuReq(true)
                                                            setCpuReq(val)
                                                        }}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="memReq">
                                                        Required memory units (bytes)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className={`form-control${validMemReq ? '' : ' is-invalid'}`}
                                                        id="memReq"
                                                        value={memReq}
                                                        onChange={e => {
                                                            if (!e.target.value) {
                                                                setValidMemReq(true)
                                                                setMemReq(null)
                                                                return;
                                                            }
                                                            const val = parseFloat(e.target.value);
                                                            if (isNaN(val)) {
                                                                setValidMemReq(false)
                                                                return;
                                                            }
                                                            setValidMemReq(true)
                                                            setMemReq(val)
                                                        }}
                                                    />
                                                </div>
                                            </>}
                                    </div>
                                </Collapse>
                            </fieldset>
                        </div>
                    </div>
                    <div className="mt-3">
                        <SubmitButton isSubmitting={isSubmitting}>
                            Submit job
                    </SubmitButton>
                    </div>
                    {jobPosted && <Redirect to="/" />}
                </form>
                :
                <div className="alert alert-danger">
                    <p><strong>You have no write access to any namespace.</strong></p>
                    <p>Ask an administrator to grant you permission to submit jobs and try again.</p>
                </div>}
        </div>
    );
}

export default JobSubmissionForm;
