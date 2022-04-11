import React, { useState, useEffect } from "react";
import axios from "axios";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";
import { useContext } from "react";
import { AuthContext } from "../AuthContext";
import ClipLoader from "react-spinners/ClipLoader";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import { ServerInfoContext } from "../ServerInfoContext";

const JobTimingInfoBar = ({ token, jobOwner, setRefreshJob, setJobStatus, setDelayedRefresh }) => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [serverInfo] = useContext(ServerInfoContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const [refresh, setRefresh] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [timingData, setTimingData] = useState(null);

    useEffect(() => {
        if (token == null || isFinished) {
            return;
        }
        const fetchJobTimes = () => {
            const reqParams = {
                recursive: false,
                username: jobOwner
            }
            const reqHeaders = {};
            if (token.startsWith("hc:")) {
                setHasError(true);
                return;
            } else {
                reqParams.token = token;
                reqHeaders["X-Fields"] = "job_usage";
            }
            axios
                .get(`${server}/usage/`, {
                    params: reqParams,
                    headers: reqHeaders
                })
                .then(res => {
                    const data = res.data.job_usage[0];
                    if (data.submitted == null) {
                        setHasError(true);
                        setAlertMsg("A problem occurred while retrieving job progress info.");
                        return;
                    }
                    let totalDuration;
                    const isFinishedTmp = data.finished != null;
                    if (isFinishedTmp) {
                        totalDuration = (new Date(data.finished) - new Date(data.submitted)) / 1000;
                    } else {
                        totalDuration = (new Date() - new Date(data.submitted)) / 1000;
                    }
                    let timingsTmp;
                    if (data.times.length > 0) {
                        const intervalDuration = (new Date(data.times[0].start) - new Date(data.submitted)) / 1000;
                        timingsTmp = [{
                            desc: 'Queued',
                            className: 'job-timings-info-queued',
                            duration: intervalDuration,
                            width: intervalDuration / totalDuration * 100
                        }].concat(data.times.map((interval, idx) => {
                            let intervalDuration;
                            if (interval.finish == null) {
                                if (data.times.length > idx + 1) {
                                    // job was restarted
                                    intervalDuration = (new Date(data.times[idx + 1].start) - new Date(interval.start)) / 1000;
                                } else if (isFinishedTmp) {
                                    // job is finished, but 'finish' was not set for interval
                                    intervalDuration = (new Date(data.finished) - new Date(interval.start)) / 1000;
                                } else {
                                    // job is still running
                                    intervalDuration = (new Date() - new Date(interval.start)) / 1000;
                                    setJobStatus(1);
                                }
                            } else {
                                intervalDuration = (new Date(interval.finish) - new Date(interval.start)) / 1000;
                            }
                            return {
                                desc: 'Running',
                                className: 'job-timings-info-running',
                                duration: intervalDuration,
                                width: intervalDuration / totalDuration * 100
                            }
                        }));
                        if (isFinishedTmp && data.times[data.times.length - 1].finish != null) {
                            const intervalDuration = (new Date(data.finished) - new Date(data.times[data.times.length - 1].finish)) / 1000;
                            timingsTmp.push({
                                desc: 'Finalizing',
                                className: 'job-timings-info-finalizing',
                                duration: intervalDuration,
                                width: intervalDuration / totalDuration * 100
                            })
                        }
                    } else {
                        timingsTmp = [{
                            desc: 'Queued',
                            className: 'job-timings-info-queued',
                            duration: totalDuration,
                            width: 100
                        }];
                    }
                    setTimingData(timingsTmp);
                    if (isFinishedTmp) {
                        setIsFinished(true);
                        if (refresh > 0) {
                            setRefreshJob(refresh => refresh + 1);
                            if (serverInfo.in_kubernetes === true) {
                                // labels for resource warnings might come in delayed,
                                // so we update job info once more delayed. Setting refreshJob
                                // to false results in no spinner being displayed while fetching data.
                                setTimeout(() => {
                                    setRefreshJob(false);
                                }, 3000);
                            }
                        }
                    } else {
                        setRefresh(refresh + 1);
                    }
                })
                .catch(err => {
                    setHasError(true);
                    setAlertMsg(`A problem occurred while retrieving job progress info. Error message: ${getResponseError(err)}`);
                });
        }
        if (refresh === 0) {
            fetchJobTimes();
        } else {
            const requestTimer = setTimeout(() => {
                fetchJobTimes();
            }, 3000);
            return () => {
                clearTimeout(requestTimer)
            }
        }
    }, [jwt, server, token, setIsFinished, isFinished,
        refresh, setRefreshJob, setTimingData, setAlertMsg, jobOwner,
        setHasError, setJobStatus, serverInfo]);

    return (
        timingData == null ?
            (hasError ?
                <span className="badge badge-danger">
                    Problems fetching timing data.
                </span> :
                <ClipLoader />) :
            <div className="job-timings-info-bar">
                {timingData.map((timingObj, idx) => {
                    const durationSeconds = `${Math.round(timingObj.duration)}s`;
                    const durationDisplayed = timingObj.duration > 3600 ?
                        `${Math.round(timingObj.duration / 360) / 10}h` : durationSeconds;
                    return <OverlayTrigger
                        key={`jobTimings${idx}`}
                        placement="top"
                        overlay={(props) =>
                            <Tooltip id={`jobTimingsTT${idx}`} {...props}>
                                {`${timingObj.desc}: ${durationDisplayed} (${Math.round(timingObj.width)}%)`}
                            </Tooltip>
                        }
                    >
                        <div
                            className={timingObj.className} style={{ width: `${Math.floor(timingObj.width * 100) / 100}%` }}>
                            {timingObj.width > 10 ? durationSeconds : ''}
                        </div>
                    </OverlayTrigger>
                })}
            </div>
    );
};

export default JobTimingInfoBar;
