import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import axios from "axios";

const AddNamespaceModal = props => {
    const { showDialog, setShowDialog, handleSuccess, existingNamespaces } = props;
    const [{ server }] = useContext(AuthContext);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [namespaceName, setNamespaceName] = useState("");

    const handleCloseDialog = () => {
        setNamespaceName("");
        setShowDialog(false);
    }
    const handleAddNamespace = () => {
        setIsSubmitting(true);
        if (existingNamespaces && existingNamespaces.find(ns => ns === namespaceName)) {
            setSubmissionErrorMsg("The namespace you entered already exists. Please choose another name.");
            setIsSubmitting(false);
            return;
        }
        axios
            .post(
                `${server}/namespaces/${encodeURIComponent(namespaceName)}`
            )
            .then(res => {
                setIsSubmitting(false);
                if (res.status === 201) {
                    handleCloseDialog();
                    handleSuccess();
                } else {
                    setSubmissionErrorMsg("Oops. Something went wrong! Please try again later..");
                }
            })
            .catch(err => {
                setSubmissionErrorMsg(`Some error occurred while trying to add the namespace. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
            });
    }

    return (
        <Modal show={showDialog} onHide={handleCloseDialog}>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    handleAddNamespace();
                    return false;
                }}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Add Namespace</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    <fieldset disabled={isSubmitting}>
                        <div className="form-group">
                            <label htmlFor="namespaceName" className="sr-only">
                                Namespace Name
                        </label>
                            <input
                                type="text"
                                className="form-control"
                                id="namespaceName"
                                placeholder="Namespace Name"
                                value={namespaceName}
                                onChange={(e) => setNamespaceName(e.target.value)}
                                required
                            />
                        </div>
                    </fieldset>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDialog}>
                        Cancel
                </Button>
                    <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                        Add Namespace
                </SubmitButton>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default AddNamespaceModal;
