import React, { useContext, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import axios from "axios";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";

const GroupMemberActionsButtonGroup = props => {
    const { id, namespace, server, username, me, label, setRefresh } = props;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [, setAlertMsg] = useContext(AlertContext);

    function deleteMember() {
        setIsSubmitting(true);
        axios
            .delete(
                `${server}/namespaces/${encodeURIComponent(namespace)}/user-groups/${encodeURIComponent(label)}`,
                {
                    params: {
                        username: id
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
                setAlertMsg(`Problems removing user: ${username} grom group: ${label}. Error message: ${getResponseError(err)}`);
            });
    }

    return (
        <div className="btn-group">
            <button className="btn btn-sm btn-outline-danger" onClick={() => setShowDeleteDialog(true)}>Remove</button>
            <Modal show={showDeleteDialog} onHide={() => setShowDeleteDialog(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Please Confirm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {username === me ?
                        `Are you sure you want to remove yourself from the group: '${label}'? This cannot be undone!` :
                        `Are you sure you want to remove: '${username}' from the group: '${label}'?`}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={deleteMember} disabled={isSubmitting}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
export default GroupMemberActionsButtonGroup;
