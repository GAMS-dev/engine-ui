import React, { useEffect, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import { getResponseError } from "./util";
import WebhooksActionsButtonGroup from "./WebhooksActionsButtonGroup";

const Webhooks = () => {

    const [isLoading, setIsLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [webhooks, setWebhooks] = useState([]);
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [displayFields] = useState([
        {
            field: "url",
            column: "Payload URL",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "events",
            column: "Events",
            sorter: "alphabetical-array",
            displayer: args => args ? args.join(",") : ""
        },
        {
            field: "created_at",
            column: "Created",
            sorter: "datetime",
            displayer: e => <TimeDisplay time={e} />
        },
        {
            field: "Recursive",
            column: "Recursive",
            sorter: "numerical",
            displayer: e => e === true ? 1 : 0
        },
        {
            field: "id,url,events",
            column: "Actions",
            displayer: (id, url, events) => <WebhooksActionsButtonGroup
                id={id}
                url={url}
                events={events ? events.join(",") : ""}
                server={server}
                setRefresh={setRefresh} />
        }
    ]);

    useEffect(() => {
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
    }, [jwt, server, roles, refresh, setAlertMsg]);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Webhooks</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group mr-2">
                        <Link to="/webhooks/create">
                            <button type="button" className="btn btn-sm btn-outline-primary h-100">
                                New Webhook
                            </button>
                        </Link>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setRefresh(refresh + 1);
                            }}
                        >
                            Refresh
                            <RefreshCw width="12px" className="ml-2" />
                        </button>
                    </div>
                </div>
            </div>
            <Table
                data={webhooks}
                noDataMsg="No Webhooks Found"
                isLoading={isLoading}
                displayFields={displayFields}
                idFieldName="id"
                sortedAsc={false}
                sortedCol="created_at"
            />
        </div>
    );
};

export default Webhooks;
