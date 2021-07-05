import React, { useEffect, useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import Table from "./Table";
import { getResponseError } from "./util";
import TimeDiffDisplay from "./TimeDiffDisplay";

const Usage = () => {

    const { username } = useParams();
    const [data, setData] = useState([]);
    const [recursive, setRecursive] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [totalSolveTime, setTotalSolveTime] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [displayFields] = useState([
        {
            field: "username",
            column: "User",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "nojobs",
            column: "Number Jobs",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "nocrash",
            column: "Number Crashes",
            sorter: "numerical",
            displayer: Number
        },
        {
            field: "queuetime",
            column: "Time in Queue",
            sorter: "numerical",
            displayer: e => <TimeDiffDisplay time={e} classNames="badge" />
        },
        {
            field: "solvetime",
            column: "Solve Time",
            sorter: "numerical",
            displayer: e => <TimeDiffDisplay time={e} classNames="badge" />
        },
        {
            field: "totaltime",
            column: "Total Time",
            sorter: "numerical",
            displayer: e => <TimeDiffDisplay time={e} classNames="badge" />
        }
    ]);
    const isInviter = roles && (roles.includes('admin') || roles.includes('inviter'));

    useEffect(() => {
        setIsLoading(true);
        axios
            .get(`${server}/usage/`, {
                params: {
                    recursive: isInviter ? recursive : false,
                    username: username,
                    from_datetime: startDate,
                    to_datetime: endDate
                }
            })
            .then(res => {
                if (res.status !== 200) {
                    setAlertMsg("Problems fetching usage information.");
                    setIsLoading(false);
                    return;
                }
                let aggregatedUsageData = Object.values(res.data.job_usage.concat(res.data.hypercube_job_usage).reduce((a, c) => {
                    if ("job_count" in c) {
                        // is Hypercube job
                        const isFinished = c.finished != null || c.completed === c.job_count;
                        let solveTime;
                        solveTime = c.jobs.reduce((a, c) => {
                            if (c.times.length === 0) {
                                return a + 0;
                            } else if (c.times[c.times.length - 1].finish) {
                                return a + ((new Date(c.times[c.times.length - 1].finish) -
                                    new Date(c.times[c.times.length - 1].start)) / 1000);
                            }
                            return a + ((new Date() -
                                new Date(c.times[c.times.length - 1].start)) / 1000);
                        }, 0);
                        let totalTime;
                        if (isFinished && c.finished == null) {
                            totalTime = NaN; //todo In the future, maybe use a flag or stg to inform
                        } else {
                            totalTime = ((isFinished ? new Date(c.finished) :
                                new Date()) - new Date(c.submitted)) / 1000;
                        }
                        // todo 0th job might not be the first one to start
                        const queuetime = ((c.jobs[0].times.length ?
                            new Date(c.jobs[0].times[0].start) : (isFinished ? NaN : new Date())) -
                            new Date(c.submitted)) / 1000;
                        if (a[c.username]) {
                            // User already exists
                            a[c.username].solvetime += solveTime;
                            a[c.username].totaltime += totalTime;
                            a[c.username].queuetime += queuetime;
                            a[c.username].nocrash += c.jobs.reduce((a, c) => {
                                return a + Math.max(0, c.times.length - 1);
                            }, 0);
                            a[c.username].nojobs += 1;
                            return a;
                        }
                        a[c.username] = {
                            username: c.username,
                            nojobs: 1,
                            nocrash: c.jobs.reduce((a, c) => {
                                return a + Math.max(0, c.times.length - 1);
                            }, 0),
                            queuetime: queuetime,
                            solvetime: solveTime,
                            totaltime: totalTime
                        };
                        return a;
                    }
                    const isFinished = c.finished != null;
                    let solveTime;
                    let queueTime;
                    if (isFinished) {
                        if (c.times.length === 0) {
                            solveTime = 0;
                            queueTime = (new Date(c.finished) - new Date(c.submitted)) / 1000;
                        } else if (c.times[c.times.length - 1].finish == null) {
                            solveTime = NaN;
                            queueTime = (new Date(c.times[0].start) - new Date(c.submitted)) / 1000;
                        } else {
                            solveTime = (
                                new Date(c.times[c.times.length - 1].finish) -
                                new Date(c.times[c.times.length - 1].start)
                            ) / 1000;
                            queueTime = (new Date(c.times[0].start) - new Date(c.submitted)) / 1000;
                        }
                    } else if (c.times.length !== 0) {
                        solveTime = (
                            new Date() -
                            new Date(c.times[c.times.length - 1].start)
                        ) / 1000;
                        queueTime = (new Date(c.times[0].start) - new Date(c.submitted)) / 1000;
                    } else { //canceling, queued
                        solveTime = 0;
                        queueTime = (new Date() - new Date(c.submitted)) / 1000;
                    }

                    if (a[c.username]) {
                        // User already exists
                        a[c.username].solvetime += solveTime;
                        a[c.username].totaltime += ((isFinished ? new Date(c.finished) : new Date()) -
                            new Date(c.submitted)) / 1000;
                        a[c.username].queuetime += queueTime;
                        a[c.username].nocrash += Math.max(0, c.times.length - 1);
                        a[c.username].nojobs += 1;
                        return a;
                    }
                    a[c.username] = {
                        username: c.username,
                        nojobs: 1,
                        nocrash: Math.max(0, c.times.length - 1),
                        queuetime: queueTime,
                        solvetime: solveTime,
                        totaltime: ((isFinished ? new Date(c.finished) : new Date()) - new Date(c.submitted)) / 1000
                    };
                    return a;
                }, Object.create(null)));
                setData(aggregatedUsageData);
                setTotalSolveTime(aggregatedUsageData.reduce((a, c) => {
                    if (isNaN(c.solvetime)) {
                        return a;
                    }
                    return a + c.solvetime;
                }, 0));
                setTotalTime(aggregatedUsageData.reduce((a, c) => {
                    return a + c.totaltime;
                }, 0));
                setIsLoading(false);
            })
            .catch(err => {
                setAlertMsg(`Problems fetching usage information. Error message: ${getResponseError(err)}`);
                setIsLoading(false);
            });
    }, [jwt, server, refresh, displayFields, setAlertMsg,
        username, recursive, startDate, endDate, isInviter]);

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">{`Usage of user: ${username}`}</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group mr-2">
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
            <div className="row">
                {isInviter &&
                    <div className="col-lg-4 col-sm-12 mb-4">
                        <label>
                            Show Invitees?
                            <input
                                name="showinvitees"
                                type="checkbox"
                                className="ml-2"
                                checked={recursive}
                                onChange={e => {
                                    setRecursive(e.target.checked)
                                }} />
                        </label>
                    </div>}
                <div className="col-lg-4 col-sm-6 col-12 mb-4">
                    <div className="row">
                        <div className="col-4">From:</div>
                        <div className="col-8">
                            <DatePicker selected={startDate} onChange={date => setStartDate(date)} />
                        </div>
                    </div>
                </div>
                <div className="col-lg-4 col-sm-6 col-12 mb-4">
                    <div className="row">
                        <div className="col-4">To:</div>
                        <div className="col-8">
                            <DatePicker selected={endDate} onChange={date => setEndDate(date)} />
                        </div>
                    </div>
                </div>
            </div>
            {data.length > 1 &&
                <div className="row">
                    <div className="col-md-6 col-12 mb-2">
                        <small>
                            <div className="row">
                                <div className="col-4">
                                    Total Time:
                                </div>
                                <div className="col-8">
                                    <TimeDiffDisplay time={totalTime} classNames="badge badge-secondary" />
                                </div>
                            </div>
                        </small>
                    </div>
                    <div className="col-md-6 col-12 mb-2">
                        <small>
                            <div className="row">
                                <div className="col-4">
                                    Total Solve Time:
                                </div>
                                <div className="col-8">
                                    <TimeDiffDisplay time={totalSolveTime} classNames="badge badge-secondary" />
                                </div>
                            </div>
                        </small>
                    </div>
                </div>}
            <Table data={data}
                noDataMsg="No Usage data found"
                displayFields={displayFields}
                sortedAsc={false}
                isLoading={isLoading}
                sortedCol="username"
                idFieldName="username" />
        </div>
    );
};

export default Usage;
