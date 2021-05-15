import React, { useContext } from "react";
import axios from "axios";
import { AlertContext } from "./Alert";
import { isActiveJob, getResponseError } from "./util";

const TerminateJobButton = props => {
    const { token, status, server, setRefresh } = props;

    const [, setAlertMsg] = useContext(AlertContext);

    function terminateJob(hardKill = false) {
        axios
            .delete(
                token.startsWith("hc:") ? `${server}/hypercube/${encodeURIComponent(token.substring(3))}?hard_kill=${hardKill}` :
                    `${server}/jobs/${encodeURIComponent(token)}?hard_kill=${hardKill}`,
                {}
            )
            .then(() => {
                setRefresh(refreshCnt => ({
                    refresh: refreshCnt + 1
                }));
            })
            .catch(err => {
                setAlertMsg(`Problems terminating job. Error message: ${getResponseError(err)}`);
            });
    }

    return (
        <>
            {isActiveJob(status) &&
                (status === -2 ?
                    <button className="btn btn-sm btn-outline-danger" onClick={() => terminateJob(true)}>Hard Kill</button> :
                    <button className="btn btn-sm btn-outline-danger" onClick={() => terminateJob()}>Cancel</button>
                )}
        </>
    );
};
export default TerminateJobButton;
