import React, { useEffect, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, ToggleLeft, ToggleRight } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import { getEventsString, getResponseError } from "./util";
import WebhooksActionsButtonGroup from "./WebhooksActionsButtonGroup";
import { Button, Modal } from "react-bootstrap";
import SubmitButton from "./SubmitButton";
import { UserLink } from "./UserLink";

const Webhooks = props => {
    const { webhookAccess, setWebhookAccess } = props;
    const [isLoading, setIsLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [webhooks, setWebhooks] = useState([]);
    const [showModalDialog, setShowModalDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterWebpush, setFilterWebpush] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [displayFields] = useState([
        {
            field: "username",
            column: "User",
            sorter: "alphabetical",
            displayer: (user) =>
                <UserLink user={user} />
        },
        {
            field: "url",
            column: "Payload URL",
            sorter: "alphabetical",
            displayer: url => {
                if (!url) {
                    return "";
                }
                const urlTmp = new URL(url);
                let urlTrimmed = urlTmp.href;
                if (urlTmp.pathname.length > 1) {
                    urlTrimmed = `${urlTrimmed.substring(0, urlTrimmed.lastIndexOf('/'))}****`;
                }
                return <span title={url}>{urlTrimmed}</span>
            }
        },
        {
            field: "events,parameterized_events",
            column: "Events",
            sorter: "alphabetical-array",
            displayer: (events, parameterized_events) => {
                let eventsStr = getEventsString(events, parameterized_events);
                return <div className="table-cell-overflow" title={eventsStr}>{eventsStr}</div>;
            }
        },
        {
            field: "created_at",
            column: "Created",
            sorter: "datetime",
            displayer: e => <TimeDisplay time={e} />
        },
        {
            field: "recursive",
            column: "Recursive",
            sorter: "numerical",
            displayer: e => e === true ? 1 : 0
        },
        {
            field: "id,url,events,parameterized_events",
            column: "Actions",
            displayer: (id, url, events, parameterized_events) => <WebhooksActionsButtonGroup
                id={id}
                url={url}
                events={getEventsString(events, parameterized_events)}
                server={server}
                setRefresh={setRefresh} />
        }
    ]);

    const setWebhookAccessConfig = (accessConfig) => {
        setIsSubmitting(true);
        setSubmissionErrorMsg("");
        const payload = new FormData();
        payload.append('webhook_access', accessConfig);
        axios
            .patch(`${server}/configuration`, payload)
            .then(() => {
                setWebhookAccess(accessConfig);
                setIsSubmitting(false);
                setShowModalDialog(false);
            })
            .catch(err => {
                setSubmissionErrorMsg(`Problems updating webhook access configuration. Error message: ${getResponseError(err)}`);
                setIsSubmitting(false);
            });
    }

    useEffect(() => {
        if (webhookAccess === "DISABLED") {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios
            .get(`${server}/users/webhooks`)
            .then(res => {
                if (res.status !== 200) {
                    setAlertMsg("Problems fetching webhooks.");
                    setIsLoading(false);
                    return;
                }
                setWebhooks(res.data);
                setIsLoading(false);
            })
            .catch(err => {
                setAlertMsg(`Problems fetching webhooks. Error message: ${getResponseError(err)}`);
                setIsLoading(false);
            });
    }, [webhookAccess, jwt, server, roles, refresh, setAlertMsg]);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Webhooks</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group me-2">
                        {roles && roles.includes('admin') && webhookAccess !== "ENABLED" &&
                            <button type="button" className="btn btn-sm btn-outline-primary h-100"
                                onClick={() => setShowModalDialog('enable')} >
                                Enable Webhooks
                            </button>}
                        {roles && roles.includes('admin') && webhookAccess !== "DISABLED" &&
                            <button type="button" className="btn btn-sm btn-outline-primary h-100"
                                onClick={() => setShowModalDialog('disable')} >
                                Disable Webhooks
                            </button>}
                        {webhookAccess === "ENABLED" || (webhookAccess === "ADMIN_ONLY" && (roles && roles.includes('admin'))) ?
                            <Link to="/webhooks/create">
                                <button type="button" className="btn btn-sm btn-outline-primary h-100">
                                    New Webhook
                                </button>
                            </Link> : <></>}
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setFilterWebpush(currFilterWebpush => !currFilterWebpush)
                            }}
                        >
                            {filterWebpush ?
                                <ToggleRight size={18} style={{ marginTop: "2px" }} />
                                :
                                <ToggleLeft size={18} style={{ marginTop: "2px" }} />
                            }
                            &nbsp;
                            <span className="flex-grow-1">
                                {filterWebpush
                                    ? "Show All"
                                    : "Hide Web Push-only"}
                            </span>
                        </button>
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
            {webhookAccess === "DISABLED" ? <p className="text-center">Webhooks/Web Push disabled</p> :
                <Table
                    data={filterWebpush ? webhooks.filter(hook => hook.url != null) : webhooks}
                    noDataMsg="No Webhooks Found"
                    isLoading={isLoading}
                    displayFields={displayFields}
                    idFieldName="id"
                    sortedAsc={false}
                    sortedCol="created_at"
                />}
            <Modal show={showModalDialog !== false} onHide={() => setShowModalDialog(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Please Confirm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    {showModalDialog === 'enable' ? 'Are you sure that you want to enable webhooks?' :
                        'Are you sure that you want to disable webhooks?'}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModalDialog(false)}>
                        Cancel
                    </Button>
                    {webhookAccess !== "ADMIN_ONLY" && <SubmitButton isSubmitting={isSubmitting} onClick={() => setWebhookAccessConfig("ADMIN_ONLY")} className="btn-primary">
                        Enable for admins only
                    </SubmitButton>}
                    {showModalDialog === 'enable' ?
                        <>
                            <SubmitButton isSubmitting={isSubmitting} onClick={() => setWebhookAccessConfig("ENABLED")} className="btn-primary">
                                Enable for everyone
                            </SubmitButton>
                        </> :
                        <SubmitButton isSubmitting={isSubmitting} onClick={() => setWebhookAccessConfig("DISABLED")} className="btn-primary">
                            Disable
                        </SubmitButton>
                    }
                </Modal.Footer>
            </Modal>
        </div >
    );
};

export default Webhooks;
