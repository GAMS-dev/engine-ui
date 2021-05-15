import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { zipAsync, getResponseError } from "./util";
import InexJSONSelector from "./InexJSONSelector";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const ModelSubmissionForm = () => {
    const { namespace, updateModel } = useParams();
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("")
    const [modelName, setModelName] = useState("");
    const [runName, setRunName] = useState("");
    const [modelFiles, setModelFiles] = useState();
    const [clArgs, setClArgs] = useState("");
    const [inexObject, setInexObject] = useState("");
    const [inexJSON, setInexJSON] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [modelAdded, setModelAdded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!updateModel) {
            return;
        }
        setIsLoading(true);
        setErrorMsg("");
        axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}`, {
            params: { model: updateModel }
        })
            .then(res => {
                if (res.data.length > 0) {
                    setModelName(updateModel);
                    setRunName(res.data[0].run ? res.data[0].run : `${updateModel}.gms`);
                    setClArgs(res.data[0].arguments.join(","));
                    setInexObject(res.data[0].inex);
                    setIsLoading(false);
                } else {
                    setErrorMsg(`Model: ${updateModel} does not exist in namespace: ${namespace}`);
                    setIsLoading(false);
                }
            })
            .catch(err => {
                setErrorMsg(`Problems while while retrieving model info. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
            });
    }, [server, updateModel, namespace]);

    const handleModelSubmission = () => {
        if (modelName.toLowerCase().endsWith(".gms")) {
            setSubmissionErrorMsg("Model name must not end with '.gms'!");
            return;
        }
        const promisesToAwait = [];

        setIsSubmitting(true);
        const modelSubmissionForm = new FormData();
        if (!modelFiles || modelFiles.length === 0) {
            if (!updateModel) {
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
        } else if (updateModel) {
            modelSubmissionForm.append("delete_arguments", "true");
        }

        if (inexJSON !== "") {
            modelSubmissionForm.append("inex_file", new Blob([inexJSON],
                { type: "application/json" }), "inex.json");
        } else if (updateModel) {
            modelSubmissionForm.append("delete_inex_file", "true");
        }
        if (runName !== "" && runName !== `${modelName}.gms`) {
            modelSubmissionForm.append("run", runName);
        } else if (updateModel) {
            modelSubmissionForm.append("delete_run", "true");
        }
        Promise.all(promisesToAwait).then(() => {
            axios({
                method: updateModel ? 'patch' : 'post',
                url: `${server}/namespaces/${encodeURIComponent(namespace)}/${encodeURIComponent(modelName)}`,
                data: modelSubmissionForm,
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            })
                .then(res => {
                    let successCode;
                    if (updateModel) {
                        successCode = 200;
                    } else {
                        successCode = 201;
                    }
                    if (res.status !== successCode) {
                        setSubmissionErrorMsg(`An error occurred while ${updateModel ? "updating" : "registering"} model. Please try again later.`);
                        setIsSubmitting(false);
                        return;
                    }
                    setIsSubmitting(false);
                    setAlertMsg(`success:Model successfully ${updateModel ? "updated" : "added"}!`);
                    setModelAdded(true);
                })
                .catch(err => {
                    setSubmissionErrorMsg(`Problems while ${updateModel ? "updating" : "registering"} model. Error message: ${getResponseError(err)}.`);
                    setIsSubmitting(false);
                });
        })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while ${updateModel ? "updating" : "registering"} model. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }
    const updateModelFiles = e => {
        setModelFiles([...e.target.files]);
        const modelNameTmp = e.target.files[0].name.split(".")[0];
        if (modelName === "") {
            setModelName(modelNameTmp)
        }
        if (runName === "") {
            setRunName(`${modelNameTmp}.gms`)
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">{updateModel ? `Update model: '${updateModel}' in namespace:` : "Add a model to namespace:"} {`'${namespace}'`}</h1>
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
                            <div className="form-group">
                                <div className="custom-file">
                                    <input type="file" className="custom-file-input"
                                        id="modelFiles"
                                        multiple
                                        onChange={updateModelFiles}
                                        required={!updateModel}
                                    />
                                    <label className="custom-file-label" htmlFor="modelFiles">
                                        {modelFiles ?
                                            `${modelFiles[0].name}${modelFiles.length > 1 ? ", ..." : ""}`
                                            : updateModel ? "Update Model Files..." : "Model Files..."}
                                    </label>
                                </div>
                            </div>
                            {!updateModel && <div className="form-group">
                                <label htmlFor="modelName" className="sr-only">
                                    Model Name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="modelName"
                                    placeholder="Identifier for the model"
                                    autoComplete="on"
                                    value={modelName}
                                    onChange={e => setModelName(e.target.value)}
                                    required
                                />
                            </div>}
                            <div className="form-group">
                                <label htmlFor="runName" className="sr-only">
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
                            <InexJSONSelector
                                label="Filter results (e.g. to reduce the size of the results archive or to restrict users from seeing certain files)?"
                                inexObject={inexObject}
                                onChangeHandler={e => setInexJSON(e)} />
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                {updateModel ? "Update Model" : "Add Model"}
                            </SubmitButton>
                        </div>
                        {modelAdded && <Redirect to="/models" />}
                    </form>
                )}
        </div>
    );
}

export default ModelSubmissionForm;
