import React, { useEffect, useContext, useState } from "react";
import Select from 'react-select';
import { RefreshCw, Users } from "react-feather";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import { getResponseError } from "./util";
import axios from "axios";
import ClipLoader from "react-spinners/ClipLoader";
import { useParams } from "react-router";
import GroupMemberActionsButtonGroup from "./GroupMemberActionsButtonGroup";
import { UserLink } from "./UserLink";

const GroupMembers = () => {
    const { namespace, label } = useParams();
    const [{ jwt, server, username, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const isInviter = roles &&
        (roles.includes("inviter") || roles.includes("admin"));

    const [refresh, setRefresh] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [addMemberIsLoading, setAddMemberIsLoading] = useState(true);
    const [invitees, setInvitees] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [usersToAdd, setUsersToAdd] = useState([]);
    const [userToAdd, setUserToAdd] = useState("");
    const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchUsersData = async () => {
            let uReq
            try {
                uReq = await axios.get(`${server}/users/`,
                    { headers: { "X-Fields": "username" } })
            } catch (err) {
                setAlertMsg(`Problems while loading users. Error message: ${getResponseError(err)}.`)
                setIsLoading(false)
                return
            }
            if (uReq.data && uReq.data.length > 0) {
                const usersTmp = uReq.data
                    .map(user => user.username);
                setInvitees(usersTmp);
            }
            setIsLoading(false);
        }
        if (!isInviter) {
            return;
        }
        setIsLoading(true);
        fetchUsersData();
    }, [jwt, server, namespace, setAlertMsg, isInviter]);

    useEffect(() => {
        const fetchGroupMembers = async () => {
            let gmReq
            try {
                gmReq = await axios.get(`${server}/namespaces/${encodeURIComponent(namespace)}/user-groups`)
            } catch (err) {
                setAlertMsg(`Problems while retrieving group members. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
                return
            }
            if (gmReq.status !== 200) {
                setAlertMsg("An error occurred while retrieving group members. Please try again later.");
                setIsLoading(false);
                return;
            }
            const groupMembersTmp = gmReq.data
                .filter(group => group.label === label)
                .map(group => group.members.map(member => ({
                    id: member.username,
                    username: member.username,
                    added_at: member.added_at,
                    added_by: member.added_by
                }))).flat()
                .sort((a, b) => ('' + a.username).localeCompare(b.username));
            setGroupMembers(groupMembersTmp);
            setIsLoading(false);
        }

        if (!namespace || !label) {
            return;
        }
        setIsLoading(true)
        fetchGroupMembers()
    }, [jwt, server, namespace, label, refresh, setAlertMsg]);

    useEffect(() => {
        const fetchUsersData = async () => {
            let uReq
            try {
                uReq = await axios.get(`${server}/users/`,
                    { headers: { "X-Fields": "username,deleted" } })
            } catch (err) {
                setSubmissionErrorMsg(`Problems while loading users. Error message: ${getResponseError(err)}.`)
                setAddMemberIsLoading(false)
                return
            }
            if (uReq.data && uReq.data.length > 0) {
                const existingUsers = groupMembers.map(member => member.username);
                const usersTmp = uReq.data
                    .filter(user => user.deleted === false)
                    .map(user => ({
                        value: user.username,
                        label: user.username
                    }))
                    .filter(user => !existingUsers.includes(user.value));
                setUsersToAdd(usersTmp);
                setUserToAdd(usersTmp[0]);
            }
            setAddMemberIsLoading(false);
        }
        if (!showAddMemberDialog) {
            return;
        }
        setAddMemberIsLoading(true)
        fetchUsersData()
    }, [jwt, server, username, groupMembers, showAddMemberDialog])

    function addUserToGroup() {
        const postUserToGroup = async () => {
            try {
                await axios.post(`${server}/namespaces/${encodeURIComponent(namespace)}/user-groups/${encodeURIComponent(label)}`, null, {
                    params: { username: userToAdd.value }
                })
            } catch (err) {
                setSubmissionErrorMsg(`Problems while adding user to group: ${label}. Error message: ${getResponseError(err)}.`)
                setIsSubmitting(false)
                return
            }
            setIsSubmitting(false);
            setShowAddMemberDialog(false);
            setRefresh(curr => curr + 1);

        }
        if (!userToAdd) {
            return;
        }
        setSubmissionErrorMsg("")
        setIsSubmitting(true)
        postUserToGroup()
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">{`User Group: ${label}`}</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group me-2">
                        {isInviter &&
                            <button type="button" className="btn btn-sm btn-outline-primary"
                                onClick={() => setShowAddMemberDialog(true)}>
                                Add Member
                                <Users width="12px" className="ms-2" />
                            </button>}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setRefresh(refresh + 1);
                            }}
                        >
                            Refresh
                            <RefreshCw width="12px" className="ms-2" />
                        </button>
                    </div>
                </div>
            </div>
            <Table
                data={groupMembers}
                noDataMsg="No Members"
                isLoading={isLoading}
                displayFields={[{
                    field: "username",
                    column: "Username",
                    sorter: "alphabetical",
                    displayer: (user) =>
                        <UserLink user={user} />
                },
                {
                    field: "added_at",
                    column: "Added",
                    sorter: "datetime",
                    displayer: e => <TimeDisplay time={e} />
                },
                {
                    field: "added_by",
                    column: "Added By",
                    sorter: "alphabetical",
                    displayer: user => user.deleted ?
                        <span className="badge rounded-pill bg-secondary ms-1">deleted</span> : <UserLink user={user.username} />

                },
                {
                    field: "id",
                    column: "Actions",
                    displayer: id => {
                        if (isInviter && id !== "admin" && invitees.includes(id)) {
                            return <GroupMemberActionsButtonGroup
                                id={id}
                                namespace={namespace}
                                server={server}
                                me={username}
                                username={id}
                                label={label}
                                setRefresh={setRefresh} />
                        } else {
                            return "-"
                        }
                    }
                }]}
                idFieldName="id"
                sortedAsc={true}
                sortedCol="username"
            />
            <Modal show={showAddMemberDialog} onHide={() => setShowAddMemberDialog(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Member to Group: {label}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    {addMemberIsLoading ?
                        <ClipLoader /> :
                        (usersToAdd && usersToAdd.length ?
                            <fieldset disabled={isSubmitting}>
                                <div className="mb-3">
                                    <label htmlFor="userToAdd" className="visually-hidden">
                                        Username
                                    </label>
                                    <Select
                                        inputId="userToAdd"
                                        isClearable={false}
                                        value={userToAdd}
                                        isSearchable={true}
                                        onChange={user => setUserToAdd(user)}
                                        options={usersToAdd}
                                    />
                                </div>
                            </fieldset> :
                            "No users found that can be added.")}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddMemberDialog(false)}>
                        Cancel
                    </Button>
                    {usersToAdd && usersToAdd.length ?
                        <Button variant="primary" onClick={addUserToGroup} disabled={isSubmitting}>
                            Add
                        </Button> : <></>}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default GroupMembers;
