import React, { useContext, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import axios from "axios";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";
import { Link } from "react-router-dom";

const GroupActionsButtonGroup = props => {
    const { id, namespace, server, roles, setRefresh } = props;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [, setAlertMsg] = useContext(AlertContext);

    function deleteGroup() {
        setIsSubmitting(true);
        axios
            .delete(
                `${server}/namespaces/${encodeURIComponent(namespace.name)}/user-groups`,
                {
                    params: {
                        label: id
                    }
                }
            )
            .then(res => {
                setIsSubmitting(false);
                setShowDeleteDialog(false);
                setRefresh(refreshCnt => ({
                    refresh: refreshCnt + 1
                }));
            })
            .catch(err => {
                setIsSubmitting(false);
                setShowDeleteDialog(false);
                setAlertMsg(`Problems deleting user group. Error message: ${getResponseError(err)}`);
            });
    }

    return (
        <>
            {namespace &&
                <div className="btn-group">
                    <Link to={`/groups/${namespace.name}/${id}`} className="btn btn-sm btn-outline-info">
                        Show Members
                    </Link>
                    {roles && (roles.includes("inviter") || roles.includes("admin")) && (namespace.permission & 2) === 2 &&
                        <>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => setShowDeleteDialog(true)}>Delete</button>
                            <Modal show={showDeleteDialog} onHide={() => setShowDeleteDialog(false)}>
                                <Modal.Header closeButton>
                                    <Modal.Title>Please Confirm</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    Are you sure you want to delete the group: '{id}' from the namespace: '{namespace.name}'? This cannot be undone!
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="primary" onClick={deleteGroup} disabled={isSubmitting}>
                                        Delete
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        </>}
                </div>
            }
        </>
    );
};
export default GroupActionsButtonGroup;
