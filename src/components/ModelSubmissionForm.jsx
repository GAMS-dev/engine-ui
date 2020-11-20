import React, { useState, useContext } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { zipAsync } from "./util";
import InexJSONSelector from "./InexJSONSelector";
import SubmitButton from "./SubmitButton";

const ModelSubmissionForm = () => {
    const { namespace } = useParams();
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [modelName, setModelName] = useState("");
    const [runName, setRunName] = useState("");
    const [modelFiles, setModelFiles] = useState();
    const [clArgs, setClArgs] = useState("");
    const [inexJSON, setInexJSON] = useState("");

    const [modelAdded, setModelAdded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleModelSubmission = () => {
        if (modelName.toLowerCase().endsWith(".gms")) {
            setSubmissionErrorMsg("Model name must not end with '.gms'!");
            return;
        }
        const promisesToAwait = [];

        setIsSubmitting(true);
        const modelSubmissionForm = new FormData();
        if (modelFiles.length > 1 ||
            !modelFiles[0].name.toLowerCase().endsWith(".zip")) {
            // we need to zip uploaded files first
            try {
                promisesToAwait.push(zipAsync(modelFiles).then(zipFile => {
                    modelSubmissionForm.append("data", zipFile, "model.zip");
                    return;
                }));
            } catch (err) {
                setSubmissionErrorMsg(err.message);
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
        }

        if (inexJSON !== "") {
            modelSubmissionForm.append("inex_file", new Blob([inexJSON],
                { type: "application/json" }), "inex.json");
        }
        if (runName && runName !== `${modelName}.gms`) {
            modelSubmissionForm.append("run", runName);
        }
        Promise.all(promisesToAwait).then(() => {
            axios
                .post(
                    `${server}/namespaces/${namespace}/${modelName}`,
                    modelSubmissionForm,
                    {
                        "Content-Type": "multipart/form-data"
                    }
                )
                .then(res => {
                    if (res.status !== 201) {
                        setSubmissionErrorMsg("An error occurred while registering model. Please try again later.");
                        setIsSubmitting(false);
                        return;
                    }
                    setAlertMsg("success:Model successfully added!");
                    setModelAdded(true);
                })
                .catch(err => {
                    setSubmissionErrorMsg(`Problems while registering model. Error message: ${err.response.data.messa}.`);
                });
        })
            .catch(err => {
                setSubmissionErrorMsg(`Problems while registering model. Error message: ${err.message}.`);
            });
        setIsSubmitting(false);
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
                <h1 className="h2">Add a model to namespace: {namespace}</h1>
            </div>
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
                            Model name
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
                    </div>
                    <div className="form-group">
                        <label htmlFor="runName" className="sr-only">
                            Name of the main file
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            id="runName"
                            placeholder="Name of the main file"
                            autoComplete="on"
                            value={runName}
                            onChange={e => setRunName(e.target.value)}
                            required
                        />
                    </div>
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
                    <InexJSONSelector label="Filter results (e.g. to reduce the size of the results archive or to restrict users from seeing certain files)?"
                        onChangeHandler={e => setInexJSON(e)} />
                </fieldset>
                <div className="mt-3">
                    <SubmitButton isSubmitting={isSubmitting}>
                        Add model
                </SubmitButton>
                </div>
                {modelAdded && <Redirect to="/models" />}
            </form>
        </div>
    );
}

export default ModelSubmissionForm;
