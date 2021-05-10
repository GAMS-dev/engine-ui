import React, { useState, useContext } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import axios from "axios";

const AddUserGroupModal = props => {
    const { showDialog, setShowDialog, handleSuccess, namespace } = props;
    const [{ server }] = useContext(AuthContext);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [groupLabel, setGroupLabel] = useState("");
    const [labelError, setLabelError] = useState("");

    const handleCloseDialog = () => {
        setGroupLabel("");
        setLabelError("");
        setSubmissionErrorMsg("");
        setShowDialog(false);
    }
    const handleAddGroup = () => {
        setIsSubmitting(true);
        axios
            .post(
                `${server}/namespaces/${namespace}/user/groups`, null,
                {
                    params: {
                        label: groupLabel
                    }
                }
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
                setIsSubmitting(false);
                if (err.response == null || err.response.status !== 400) {
                    setSubmissionErrorMsg(`Some error occurred. Error message: ${getResponseError(err)}.`);
                } else {
                    setSubmissionErrorMsg(err.response.data.message);
                    if (err.response.data.hasOwnProperty('errors') &&
                        err.response.data.errors.hasOwnProperty('label')) {
                        setLabelError(err.response.data.errors.label);
                    }
                }
            });
    }

    return (
        <Modal show={showDialog} onHide={handleCloseDialog}>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    handleAddGroup();
                    return false;
                }}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Add User Group</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    <fieldset disabled={isSubmitting}>
                        <div className="form-group">
                            <label htmlFor="groupLabel" className="sr-only">
                                Group Label
                        </label>
                            <input
                                type="text"
                                className={"form-control" + (labelError ? " is-invalid" : "")}
                                id="groupLabel"
                                placeholder="Group Label"
                                value={groupLabel}
                                onChange={(e) => setGroupLabel(e.target.value)}
                                required
                            />
                            <div className="invalid-feedback"> {labelError} </div>
                        </div>
                    </fieldset>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDialog}>
                        Cancel
                </Button>
                    <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                        Add Group
                </SubmitButton>
                </Modal.Footer>
            </form>
        </Modal>
    );
};

export default AddUserGroupModal;
