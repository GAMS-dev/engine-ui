import React, { useEffect, useContext, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Chart as ChartJS, LinearScale, TimeScale, PointElement, LineElement, Legend, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom'
import { RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import Table from "./Table";
import { getResponseError, mergeSortedArrays } from "./util";
import TimeDiffDisplay from "./TimeDiffDisplay";
import TimeDisplay from "./TimeDisplay";
import Select from 'react-select';

ChartJS.register(
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    zoomPlugin
);


const Usage = () => {

    const { username } = useParams();
    const [data, setData] = useState([]);
    const [dataDisaggregated, setDataDisaggregated] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [usersToFiler, setUsersToFiler] = useState([]);
    const [aggregatedChartData, setAggregatedChartData] = useState([]);
    const [disaggregatedChartData, setDisaggregatedChartData] = useState([]);
    const [recursive, setRecursive] = useState(false);
    const [aggregated, setAggregated] = useState(true);
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
    const [displayFieldsDisaggregated] = useState([
        {
            field: "username",
            column: "User",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "token,job_count",
            column: "Job token",
            displayer: (name, job_count) => <>
                {job_count != null ? <Link to={`/jobs/hc:${name}`}>{name}
                    <sup>
                        <span className="badge rounded-pill bg-primary ms-1">HC</span>
                    </sup></Link> :
                    <Link to={`/jobs/${name}`}>{name}</Link>}
            </>
        },
        {
            field: "submitted",
            column: "Submitted",
            sorter: "datetime",
            displayer: e => <TimeDisplay time={e} />
        },
        {
            field: "finished",
            column: "Finished",
            sorter: "datetime",
            displayer: e => <TimeDisplay time={e} />
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
                },
                headers: {
                    "X-Fields": "job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}}"
                }
            })
            .then(res => {
                const dataDisaggregatedTmp = res.data.job_usage.concat(res.data.hypercube_job_usage);
                let aggregatedUsageData = Object.values(dataDisaggregatedTmp.reduce((a, c) => {
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
                            totalTime = NaN; //TODO: In the future, maybe use a flag or sth to inform
                        } else {
                            totalTime = ((isFinished ? new Date(c.finished) :
                                new Date()) - new Date(c.submitted)) / 1000;
                        }
                        // TODO: 0th job might not be the first one to start
                        const queuetime = c.jobs.length ? ((c.jobs[0].times.length ?
                            new Date(c.jobs[0].times[0].start) : (isFinished ? NaN : new Date())) -
                            new Date(c.submitted)) / 1000 : 0;
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
                            solveTime = (
                                new Date(c.finished) -
                                new Date(c.times[c.times.length - 1].start)
                            ) / 1000;
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
                const chartDataTmp = {};
                const aggregatedChartDataTmp = [];
                const chartColors = ["rgba(31,120,180,0.2)", "rgba(51,160,44,0.2)",
                    "rgba(227,26,28,0.2)", "rgba(255,127,0,0.2)",
                    "rgba(106,61,154,0.2)", "rgba(177,89,40,0.2)",
                    "rgba(249,185,183,0.2)", "rgba(173,169,183,0.2)",
                    "rgba(102,16,31,0.2)", "rgba(196,90,179,0.2)",
                    "rgba(27,231,255,0.2)", "rgba(76,159,112,0.2)",
                    "rgba(240,247,87,0.2)", "rgba(158,109,66,0.2)",
                    "rgba(8,103,136,0.2)", "rgba(224,202,60,0.2)",
                    "rgba(186,151,144,0.2)", "rgba(235,69,17,0.2)",
                    "rgba(155,93,229,0.2)", "rgba(71,250,26,0.2)",
                    "rgba(56,97,140,0.2)", "rgba(250,216,214,0.2)",
                    "rgba(55,61,32,0.2)", "rgba(33,11,44,0.2)",
                    "rgba(216,17,89,0.2)", "rgba(8,189,189,0.2)",
                    "rgba(53,255,105,0.2)", "rgba(109,33,60,0.2)",
                    "rgba(220,247,99,0.2)", "rgba(224,108,0,0.2)",
                    "rgba(233,215,88,0.2)", "rgba(130,145,145,0.2)",
                    "rgba(232,153,141,0.2)", "rgba(145,182,150,0.2)",
                    "rgba(113,73,85,0.2)", "rgba(42,42,114,0.2)",
                    "rgba(0,255,197,0.2)", "rgba(108,58,92,0.2)",
                    "rgba(139,30,63,0.2)", "rgba(62,114,29,0.2)"];
                let chartEvents = {};
                // first, we build the array of events for each user
                const getEvents = (el, multiplier) => {
                    if (el.length === 0) {
                        // job did not start yet
                        return [];
                    }
                    const t = el[el.length - 1];
                    let finished = new Date();
                    if (t.finish != null) {
                        // job finished
                        finished = new Date(t.finish);
                    }
                    return [{
                        isArrival: true,
                        multiplier: multiplier,
                        key: new Date(t.start)
                    },
                    {
                        isArrival: false,
                        multiplier: multiplier,
                        key: finished
                    }];
                }
                for (let i = 0; i < dataDisaggregatedTmp.length; i += 1) {
                    if (!(dataDisaggregatedTmp[i].username in chartEvents)) {
                        chartEvents[dataDisaggregatedTmp[i].username] = [];
                    }
                    const multiplier = (dataDisaggregatedTmp[i].labels != null && dataDisaggregatedTmp[i].labels.multiplier != null) ? dataDisaggregatedTmp[i].labels.multiplier : 1;
                    if ('times' in dataDisaggregatedTmp[i]) {
                        // normal job
                        chartEvents[dataDisaggregatedTmp[i].username].push(...getEvents(dataDisaggregatedTmp[i].times, multiplier));

                    } else if ('jobs' in dataDisaggregatedTmp[i]) {
                        // Hypercube job
                        for (let j = 0; j < dataDisaggregatedTmp[i].jobs.length; j += 1) {
                            chartEvents[dataDisaggregatedTmp[i].username].push(...getEvents(dataDisaggregatedTmp[i].jobs[j].times, multiplier));
                        }
                    }
                }
                // next, we sort the events for each user
                const usernames = Object.keys(chartEvents);
                for (let i = 0; i < usernames.length; i += 1) {
                    chartEvents[usernames[i]] = chartEvents[usernames[i]].sort((a, b) => (a.key - b.key));
                    const seriesData = [];
                    let parallelCount = 0;
                    for (let j = 0; j < chartEvents[usernames[i]].length; j += 1) {
                        if (chartEvents[usernames[i]][j].isArrival) {
                            parallelCount += chartEvents[usernames[i]][j].multiplier;
                        } else {
                            parallelCount -= chartEvents[usernames[i]][j].multiplier;
                        }
                        seriesData.push({ x: chartEvents[usernames[i]][j].key, y: parallelCount });
                    }
                    chartDataTmp[usernames[i]] = {
                        label: usernames[i],
                        backgroundColor: i < chartColors.length ? chartColors[i] : 'rgba(0,0,0,0.2)',
                        borderColor: i < chartColors.length ? chartColors[i] : 'rgba(0,0,0,0.2)',
                        fill: true,
                        stepped: true,
                        data: seriesData
                    }
                }
                let parallelCount = 0;
                const chartEventsAggregated = mergeSortedArrays(Object.values(chartEvents), (a, b) => (a.key - b.key));
                for (let i = 0; i < chartEventsAggregated.length; i += 1) {
                    if (chartEventsAggregated[i].isArrival) {
                        parallelCount += chartEventsAggregated[i].multiplier;
                    } else {
                        parallelCount -= chartEventsAggregated[i].multiplier;
                    }
                    aggregatedChartDataTmp.push({ x: chartEventsAggregated[i].key, y: parallelCount });
                }
                setAggregatedChartData([{
                    label: 'Total',
                    backgroundColor: '#000000',
                    borderColor: '#000000',
                    stepped: true,
                    fill: true,
                    data: aggregatedChartDataTmp
                }]);
                const availableUsersTmp = Object.keys(chartDataTmp).map((el, idx) => ({ label: el, value: idx }));
                setAvailableUsers(availableUsersTmp.sort((a, b) => ('' + a.label).localeCompare(b.label)));
                setUsersToFiler(availableUsersTmp.slice(0, 5));
                setDisaggregatedChartData(Object.values(chartDataTmp));
                setData(aggregatedUsageData);
                setDataDisaggregated(dataDisaggregatedTmp.sort((a, b) => ('' + a.username).localeCompare(b.username)));
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
                    <div className="btn-group me-2">
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
            <div className="row">
                {isInviter &&
                    <div className="col-sm-6 mb-4">
                        <label>
                            Show Invitees?
                            <input
                                name="showinvitees"
                                type="checkbox"
                                className="ms-2"
                                checked={recursive}
                                onChange={e => {
                                    setRecursive(e.target.checked)
                                }} />
                        </label>
                    </div>}
                <div className="col-sm-6 mb-4">
                    <label>
                        Show disaggregated data?
                        <input
                            name="showAggregated"
                            type="checkbox"
                            className="ms-2"
                            checked={!aggregated}
                            onChange={e => {
                                setAggregated(!e.target.checked)
                            }} />
                    </label>
                </div>
            </div>
            <div className="row">
                <div className="col-sm-6 col-12 mb-4">
                    <div className="row">
                        <div className="col-4">From:</div>
                        <div className="col-8">
                            <DatePicker selected={startDate} onChange={date => setStartDate(date)} />
                        </div>
                    </div>
                </div>
                <div className="col-sm-6 col-12 mb-4">
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
                                    <TimeDiffDisplay time={totalTime} classNames="badge bg-secondary" />
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
                                    <TimeDiffDisplay time={totalSolveTime} classNames="badge bg-secondary" />
                                </div>
                            </div>
                        </small>
                    </div>
                </div>}
            {data.length > 0 &&
                <>
                    {!aggregated && <Select
                        id="usersToFiler"
                        isMulti={true}
                        isSearchable={true}
                        placeholder={'Filter users'}
                        closeMenuOnSelect={false}
                        blurInputOnSelect={false}
                        value={usersToFiler}
                        onChange={users => setUsersToFiler(users)}
                        options={availableUsers}
                        isOptionDisabled={() => usersToFiler.length >= 5}
                    />}
                    <Line data={{
                        datasets: aggregated ? aggregatedChartData : disaggregatedChartData.filter((_, index) =>
                            usersToFiler.map(el => parseInt(el.value, 10)).includes(index))
                    }}
                        height={80}
                        options={{
                            interaction: {
                                mode: 'nearest',
                                axis: 'x',
                                intersect: false
                            },
                            plugins: {
                                zoom: {
                                    zoom: {
                                        wheel: {
                                            enabled: true
                                        },
                                        pinch: {
                                            enabled: true
                                        },
                                        mode: "x"
                                    },
                                    pan: {
                                        enabled: true,
                                        mode: "x"
                                    }
                                }
                            },
                            elements: {
                                point: {
                                    radius: 0
                                }
                            },
                            animation: {
                                duration: 0
                            },
                            scales: {
                                x: {
                                    type: 'time',
                                    min: startDate,
                                    max: endDate,
                                    autoSkip: true
                                },
                                y: {
                                    title: {
                                        display: true,
                                        text: 'Weighted parallel jobs'
                                    }
                                }
                            }
                        }} />
                </>}
            <Table data={aggregated ? data : dataDisaggregated}
                noDataMsg="No Usage data found"
                displayFields={aggregated ? displayFields : displayFieldsDisaggregated}
                sortedAsc={false}
                isLoading={isLoading}
                sortedCol="username"
                idFieldName={aggregated ? "username" : "token"} />
        </div>
    );
};

export default Usage;
