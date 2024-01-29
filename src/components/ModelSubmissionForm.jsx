import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import Select from 'react-select';
import { zipAsync, getResponseError } from "./util";
import InexJSONSelector from "./InexJSONSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import FileDropZone from "./FileDropZone";
import { useCallback } from "react";

const ModelSubmissionForm = () => {
    const { namespace, modelname } = useParams();
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("")
    const [newModelName, setNewModelName] = useState("");
    const [runName, setRunName] = useState("");
    const [textEntries, setTextEntries] = useState("");
    const [streamEntries, setStreamEntries] = useState("");
    const [userGroups, setUserGroups] = useState([]);
    const [availableUserGroups, setAvailableUserGroups] = useState([]);
    const [modelFiles, setModelFiles] = useState();
    const [clArgs, setClArgs] = useState("");
    const [inexObject, setInexObject] = useState("");
    const [inexJSON, setInexJSON] = useState("");
    const [protectModelFiles, setProtectModelFiles] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [modelAdded, setModelAdded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchModelData = async () => {
            setIsLoading(true);
            setErrorMsg("");
            try {
                const modelDataPromise = axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}`, {
                    params: { model: modelname },
                    headers: { "X-Fields": "*" }
                });
                const groupDataPromise = axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}/user-groups`);
                const resModelData = await modelDataPromise;
                if (resModelData.data.length > 0) {
                    const selectedGroups = resModelData.data[0].user_groups ?
                        resModelData.data[0].user_groups.map(group => ({
                            value: group,
                            label: group
                        })) : [];
                    const resGroupData = await groupDataPromise;
                    let availableGroupsTmp = resGroupData.data
                        .map(group => group.label);
                    availableGroupsTmp = availableGroupsTmp
                        .concat(resModelData.data[0].user_groups ?
                            resModelData.data[0].user_groups.filter(group =>
                                !availableGroupsTmp.includes(group)) : []);
                    setAvailableUserGroups(availableGroupsTmp.map(group => ({
                        value: group,
                        label: group
                    })));
                    setUserGroups(selectedGroups);
                    setNewModelName(modelname);
                    setRunName(resModelData.data[0].run ? resModelData.data[0].run : `${modelname}.gms`);
                    setClArgs(resModelData.data[0].arguments.join(","));
                    setTextEntries(resModelData.data[0].text_entries.join(","));
                    setStreamEntries(resModelData.data[0].stream_entries.join(","));
                    setInexObject(resModelData.data[0].inex);
                    setProtectModelFiles(resModelData.data[0].protect_model_files === true);
                } else {
                    setErrorMsg(`Model: ${modelname} does not exist in namespace: ${namespace}`);
                }
            } catch (err) {
                setErrorMsg(`Problems while while retrieving model info. Error message: ${getResponseError(err)}.`);
            } finally {
                setIsLoading(false);
            }
        }
        const fetchGroupData = async () => {
            setIsLoading(true);
            setErrorMsg("");
            try {
                const groupDataPromise = axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}/user-groups`);
                const resGroupData = await groupDataPromise;
                setAvailableUserGroups(resGroupData.data.map(group => ({
                    value: group.label,
                    label: group.label
                })));
            } catch (err) {
                setErrorMsg(`Problems while while user group info. Error message: ${getResponseError(err)}.`);
            } finally {
                setIsLoading(false);
            }
        }
        if (modelname) {
            fetchModelData();
        } else {
            fetchGroupData();
        }
    }, [server, modelname, namespace]);

    const handleModelSubmission = () => {
        if (newModelName.toLowerCase().endsWith(".gms")) {
            setSubmissionErrorMsg("Model name must not end with '.gms'!");
            return;
        }
        const promisesToAwait = [];

        setIsSubmitting(true);
        const modelSubmissionForm = new FormData();
        if (!modelFiles || modelFiles.length === 0) {
            if (!modelname) {
                setSubmissionErrorMsg("No model data provided!");
                setIsSubmitting(false);
                return;
            }
        } else if (modelFiles.length > 1 ||
            !modelFiles[0].name.toLowerCase().endsWith(".zip")) {
            // we need to zip uploaded files first
            try {
                promisesToAwait.push(zipAsync(modelFiles).then(zipFile => {
                    modelSubmissionForm.append("data", zipFile, "model.zip");
                    return;
                }));
            } catch (err) {
                setSubmissionErrorMsg(getResponseError(err));
                setIsSubmitting(false);
                return;
            }
        } else {
            modelSubmissionForm.append("data", modelFiles[0], "model.zip");
        }

        if (clArgs.trim() !== "") {
            const splitClArgs = clArgs.trim().split(",");
            for (let i = 0; i < splitClArgs.length; i++) {
                modelSubmissionForm.append("arguments", splitClArgs[i].trim());
            }
        } else if (modelname) {
            modelSubmissionForm.append("delete_arguments", "true");
        }

        if (textEntries.trim() !== "") {
            const splitTextEntries = textEntries.trim().split(",");
            for (let i = 0; i < splitTextEntries.length; i++) {
                modelSubmissionForm.append("text_entries", splitTextEntries[i].trim());
            }
        } else if (modelname) {
            modelSubmissionForm.append("delete_text_entries", "true");
        }

        modelSubmissionForm.append("protect_model_files", protectModelFiles);

        if (streamEntries.trim() !== "") {
            const splitStreamEntries = streamEntries.trim().split(",");
            for (let i = 0; i < splitStreamEntries.length; i++) {
                modelSubmissionForm.append("stream_entries", splitStreamEntries[i].trim());
            }
        } else if (modelname) {
            modelSubmissionForm.append("delete_stream_entries", "true");
        }

        if (inexJSON !== "") {
            modelSubmissionForm.append("inex_string", inexJSON);
        } else if (modelname) {
            modelSubmissionForm.append("delete_inex_file", "true");
        }
        if (runName !== "" && runName !== `${newModelName}.gms`) {
            modelSubmissionForm.append("run", runName);
        } else if (modelname) {
            modelSubmissionForm.append("delete_run", "true");
        }
        if (userGroups.length > 0) {
            for (let i = 0; i < userGroups.length; i++) {
                modelSubmissionForm.append("user_groups", userGroups[i].value);
            }
        } else if (modelname) {
            modelSubmissionForm.append("delete_user_groups", "true");
        }
        Promise.all(promisesToAwait).then(() => {
            axios({
                method: modelname ? 'patch' : 'post',
                url: `${server}/namespaces/${encodeURIComponent(namespace)}/models/${encodeURIComponent(newModelName)}`,
                data: modelSubmissionForm,
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            })
                .then(res => {
                    let successCode;
                    if (modelname) {
                        successCode = 200;
                    } else {
                        successCode = 201;
                    }
                    if (res.status !== successCode) {
                        setSubmissionErrorMsg(`An error occurred while ${modelname ? "updating" : "registering"} model. Please try again later.`);
                        setIsSubmitting(false);
                        return;
                    }
                    setIsSubmitting(false);
                    setAlertMsg(`success:Model successfully ${modelname ? "updated" : "added"}!`);
                    setModelAdded(true);
                })
                .catch(err => {
                    setSubmissionErrorMsg(`Problems while ${modelname ? "updating" : "registering"} model. Error message: ${getResponseError(err)}.`);
                    setIsSubmitting(false);
                });
        })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while ${modelname ? "updating" : "registering"} model. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }
    const updateModelFiles = useCallback(acceptedFiles => {
        setModelFiles([...acceptedFiles]);
        const modelNameTmp = acceptedFiles[0].name.split(".")[0];
        if (newModelName === "") {
            setNewModelName(modelNameTmp)
        }
        if (runName === "") {
            setRunName(`${modelNameTmp}.gms`)
        }
    }, [runName, newModelName]);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">{modelname ? `Update model: '${modelname}' in namespace:` : "Add a model to namespace:"} {`'${namespace}'`}</h1>
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
                            handleModelSubmission();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="mb-3">
                                <FileDropZone
                                    label={modelname ? "Drop updated model files here" : "Drop model files here"}
                                    onDrop={updateModelFiles} />
                            </div>
                            {!modelname && <div className="mb-3">
                                <label htmlFor="newModelName" className="visually-hidden">
                                    Model Name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="newModelName"
                                    placeholder="Identifier for the model"
                                    autoComplete="on"
                                    value={newModelName}
                                    onChange={e => setNewModelName(e.target.value)}
                                    required
                                />
                            </div>}
                            <div className="mb-3">
                                <label htmlFor="runName" className="visually-hidden">
                                    Name of the Main File
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="runName"
                                    placeholder="Name of the main file"
                                    autoComplete="on"
                                    value={runName}
                                    onChange={e => setRunName(e.target.value)}
                                />
                            </div>
                            <div className="mb-3">
                                <label htmlFor="clArgs" className="visually-hidden">
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
                            <InexJSONSelector
                                label="Filter results (e.g. to reduce the size of the results archive or to restrict users from seeing certain files)?"
                                inexObject={inexObject}
                                onChangeHandler={e => setInexJSON(e)} />
                            {availableUserGroups.length > 0 &&
                                <div className="mb-3 mt-3">
                                    <label htmlFor="userGroups" className="visually-hidden">
                                        User Groups
                                    </label>
                                    <Select
                                        id="userGroups"
                                        value={userGroups}
                                        isMulti={true}
                                        isSearchable={true}
                                        placeholder={'User Groups'}
                                        isDisabled={isSubmitting}
                                        closeMenuOnSelect={false}
                                        blurInputOnSelect={false}
                                        onChange={setUserGroups}
                                        options={availableUserGroups}
                                    />
                                </div>}
                            <div className="form-check">
                                <input type="checkbox"
                                    className="form-check-input"
                                    checked={protectModelFiles}
                                    onChange={e => setProtectModelFiles(e.target.checked)}
                                    id="protectModelFiles" />
                                <label className="form-check-label" htmlFor="protectModelFiles">Should model files be protected from being overwritten by data files?</label>
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                {modelname ? "Update Model" : "Add Model"}
                            </SubmitButton>
                        </div>
                        {modelAdded && <Navigate to={`/models/${encodeURIComponent(namespace)}`} />}
                    </form>
                )}
        </div>
    );
}

export default ModelSubmissionForm;
