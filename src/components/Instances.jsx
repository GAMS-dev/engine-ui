import React, { useEffect, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import Table from "./Table";
import { getResponseError } from "./util";
import InstancesActionsButtonGroup from "./InstancesActionsButtonGroup";

const Instances = () => {

    const [isLoading, setIsLoading] = useState(true);
    const [refresh, setRefresh] = useState(0);
    const [instances, setInstances] = useState([]);
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [displayFields] = useState([
        {
            field: "label",
            column: "Instance Label",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "cpu_request",
            column: "CPU (vCPU)",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "memory_request",
            column: "Memory (MiB)",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "workspace_request",
            column: "Workspace (MiB)",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "multiplier",
            column: "Multiplier",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "id,label",
            column: "Actions",
            displayer: (_, label) => <InstancesActionsButtonGroup
                server={server}
                label={label}
                setRefresh={setRefresh} />
        }
    ]);

    useEffect(() => {
        const fetchInstances = async () => {
            let iReq
            try {
                iReq = await axios.get(`${server}/usage/instances`)
            } catch (err) {
                setAlertMsg(`Problems fetching instance information. Error message: ${getResponseError(err)}`)
                setIsLoading(false)
                return
            }
            if (iReq.status !== 200) {
                setAlertMsg("Problems fetching instance information.");
                setIsLoading(false);
                return;
            }
            setInstances(iReq.data.sort((a, b) => ('' + a.label).localeCompare(b.label)));
            setIsLoading(false);
        }
        if (!roles.length || roles.find(role => role === "admin") === undefined) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        fetchInstances();
    }, [jwt, server, roles, refresh, setAlertMsg]);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <div></div>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group me-2">
                        <Link to="update">
                            <button type="button" className="btn btn-sm btn-outline-primary h-100">
                                New Instance
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
                            <RefreshCw width="12px" className="ms-2" />
                        </button>
                    </div>
                </div>
            </div>
            <Table
                data={instances}
                noDataMsg="No Instances Found"
                isLoading={isLoading}
                displayFields={displayFields}
                idFieldName="label"
                sortedAsc={true}
                sortedCol="label"
            />
        </div>
    );
};

export default Instances;
