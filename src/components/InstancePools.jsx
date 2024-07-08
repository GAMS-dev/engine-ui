import React, { useEffect, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import { Layers, RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import Table from "./Table";
import { formatInstancesSelectInput, getResponseError } from "./util";
import InstancePoolsActionsButtonGroup from "./InstancePoolsActionsButtonGroup";
import axios from "axios";
import SubmitButton from "./SubmitButton";
import { UserLink } from "./UserLink";

const InstancePools = ({ instancePoolAccess, setInstancePoolAccess }) => {
    const [{ jwt, server, username, roles }] = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [userInvitees, setUserInvitees] = useState([username]);
    const [instancePools, setInstancesPools] = useState([]);
    const [showInstancePoolAccessModal, setShowInstancePoolAccessModal] = useState(false);
    const [poolAccessIsSubmitting, setPoolAccessIsSubmitting] = useState(false);
    const [poolAccessSubmissionError, setPoolAccessSubmissionError] = useState("");
    const [, setAlertMsg] = useContext(AlertContext);

    const instancePoolsEnabled = instancePoolAccess === "ENABLED" ||
        (['INVITER_ONLY', 'ADMIN_ONLY'].includes(instancePoolAccess) && roles?.includes('admin') === true) ||
        (instancePoolAccess === 'INVITER_ONLY' && roles?.includes('inviter') === true);

    const [displayFieldsPools] = useState([
        {
            field: "label",
            column: "Instance Label",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "owner",
            column: "Owner",
            sorter: "alphabetical",
            displayer: user => user.deleted ?
                <span className="badge rounded-pill bg-secondary ms-1">deleted</span> :
                < UserLink user={user.username} >
                    {user.username === username ? <sup>
                        <span className="badge rounded-pill bg-primary ms-1">me</span>
                    </sup> : <></>
                    }
                </UserLink >
        },
        {
            field: "instance",
            column: "Instance",
            sorter: "alphabetical",
            displayer: (instance) =>
                formatInstancesSelectInput([{
                    'label': instance.label,
                    'cpu_request': instance.cpu_request,
                    'memory_request': instance.memory_request,
                    'multiplier': instance.multiplier
                }])[0].label
        },
        {
            field: "size",
            column: "Size",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "size_active",
            column: "Active Workers",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "size_busy",
            column: "Busy Workers",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "id,label,owner,size,size_active,cancelling",
            column: "Actions",
            displayer: (_, label, owner, size, currentSize, isCanceling) => <InstancePoolsActionsButtonGroup
                server={server}
                label={label}
                isPool={true}
                hasPoolWritePerm={roles?.includes('admin') === true || userInvitees.includes(owner.username)}
                poolSize={size}
                poolSizeCurrent={currentSize}
                poolIsCanceling={isCanceling}
                instancePoolsEnabled={instancePoolsEnabled}
                setRefresh={setRefresh} />
        }
    ]);

    useEffect(() => {
        const fetchInstances = async () => {
            setIsLoading(true);
            try {
                const instancePoolData = await axios.get(`${server}/usage/pools/${username}`);
                if (roles?.includes('inviter') === true) {
                    const userInvitees = await axios.get(`${server}/users/`);
                    setUserInvitees(userInvitees.data.filter(user => user.deleted === false).map(user => user.username));
                } else {
                    setUserInvitees([username]);
                }
                setInstancesPools(instancePoolData.data.instance_pools_available);
            }
            catch (err) {
                setAlertMsg(`An error occurred fetching instances. Error message: ${getResponseError(err)}.`);
                return;
            }
            setIsLoading(false);
        }
        fetchInstances();
    }, [jwt, server, username, roles, refresh, setAlertMsg]);

    const setInstancePoolAccessConfig = (accessConfig) => {
        setPoolAccessIsSubmitting(true);
        setPoolAccessSubmissionError("");
        const payload = new FormData();
        payload.append('instance_pool_access', accessConfig);
        axios
            .patch(`${server}/configuration`, payload)
            .then(() => {
                setInstancePoolAccess(accessConfig);
                setPoolAccessIsSubmitting(false);
                setShowInstancePoolAccessModal(false);
            })
            .catch(err => {
                setPoolAccessSubmissionError(`Problems updating instance pool access configuration. Error message: ${getResponseError(err)}`);
                setPoolAccessIsSubmitting(false);
            });
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Instance Pools</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group me-2">
                        {instancePoolsEnabled ?
                            <Link to="/pools/new">
                                <button type="button" className="btn btn-sm btn-outline-primary h-100">
                                    New Instance Pool
                                    <Layers width="12px" className="ms-2" />
                                </button>
                            </Link> : <></>}
                        {roles && roles.includes('admin') && instancePoolAccess !== "ENABLED" &&
                            <button type="button" className="btn btn-sm btn-outline-primary h-100"
                                onClick={() => setShowInstancePoolAccessModal('enable')} >
                                Enable Instance Pools
                            </button>}
                        {roles && roles.includes('admin') && instancePoolAccess !== "DISABLED" &&
                            <button type="button" className="btn btn-sm btn-outline-primary h-100"
                                onClick={() => setShowInstancePoolAccessModal('disable')} >
                                Disable Instance Pools
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
            {instancePoolAccess === "DISABLED" ? <p className="text-center">Instance pools disabled</p> : <Table
                data={instancePools}
                noDataMsg="No Instance Pools Found"
                isLoading={isLoading}
                displayFields={displayFieldsPools}
                idFieldName="label"
                sortedAsc={true}
                sortedCol="label"
            />}
            <Modal size="lg" show={showInstancePoolAccessModal !== false} onHide={() => setShowInstancePoolAccessModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Please Confirm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: poolAccessSubmissionError !== "" ? "block" : "none" }}>
                        {poolAccessSubmissionError}
                    </div>
                    {showInstancePoolAccessModal === 'enable' ? 'Are you sure that you want to enable instance pools?' :
                        'Are you sure that you want to disable instance pools?'}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowInstancePoolAccessModal(false)}>
                        Cancel
                    </Button>
                    {instancePoolAccess !== 'ADMIN_ONLY' &&
                        <SubmitButton poolAccessIsSubmitting={poolAccessIsSubmitting} onClick={() => setInstancePoolAccessConfig("ADMIN_ONLY")} className="btn-primary">
                            Enable for admins only
                        </SubmitButton>}
                    {instancePoolAccess !== 'INVITER_ONLY' &&
                        <SubmitButton poolAccessIsSubmitting={poolAccessIsSubmitting} onClick={() => setInstancePoolAccessConfig("INVITER_ONLY")} className="btn-primary">
                            Enable for inviters only
                        </SubmitButton>}
                    {showInstancePoolAccessModal === 'enable' ?
                        <>
                            <SubmitButton poolAccessIsSubmitting={poolAccessIsSubmitting} onClick={() => setInstancePoolAccessConfig("ENABLED")} className="btn-primary">
                                Enable for everyone
                            </SubmitButton>
                        </> :
                        <SubmitButton poolAccessIsSubmitting={poolAccessIsSubmitting} onClick={() => setInstancePoolAccessConfig("DISABLED")} className="btn-primary">
                            Disable
                        </SubmitButton>
                    }
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default InstancePools;
