import React, { useContext } from "react";
import axios from "axios";
import { AlertContext } from "./Alert";

const TerminateJobButton = props => {
    const { token, status, server, setRefresh } = props;

    const [, setAlertMsg] = useContext(AlertContext);

    function terminateJob(hardKill = false) {
        axios
            .delete(
                token.startsWith("hc:") ? `${server}/hypercube/${token.substring(3)}?hard_kill=${hardKill}` : `${server}/jobs/${token}?hard_kill=${hardKill}`,
                {}
            )
            .then(() => {
                setRefresh(refreshCnt => ({
                    refresh: refreshCnt + 1
                }));
            })
            .catch(err => {
                setAlertMsg(`Problems terminating job. Error message: ${err.message}`);
            });
    }

    return (
        <>
            {status >= 0 && status < 10 &&
                <button className="btn btn-sm btn-outline-danger" onClick={() => terminateJob()}>Cancel</button>}
            {status === -2 &&
                <button className="btn btn-sm btn-outline-danger" onClick={() => terminateJob(true)}>Hard kill</button>}
        </>
    );
};
export default TerminateJobButton;
