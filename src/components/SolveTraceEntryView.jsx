import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getResponseError } from "./util";
import { Line } from 'react-chartjs-2';

const SolveTraceEntryView = props => {
    const { solveTraceEntry, server, setRefreshJob, jobFinished } = props;
    const [data, setData] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [refresh, setRefresh] = useState(0);
    const { token } = useParams();

    useEffect(() => {
        const fetchStreamEntry = () => {
            axios
            [jobFinished ? 'get' : 'delete'](
                `${server}/jobs/${token}/${jobFinished ? 'text-entry' : 'stream-entry'}/${solveTraceEntry}`
            )
                .then(res => {
                    try {
                        const dataRaw = res.data.entry_value
                            .trim()
                            .split(/\r\n|\n/)
                            .filter(l => !l.startsWith('* '))
                            .map(l => l.split(",").slice(3,).map(el => parseFloat(el)));
                        if (jobFinished) {
                            setData(dataRaw);
                        } else {
                            setData(el => el.concat(dataRaw));
                            setRefresh(refresh + 1);
                        }
                    } catch (err) {
                        setErrorMsg(`Problems parsing solvetrace file. Error message: ${getResponseError(err)}`);
                    };
                })
                .catch(err => {
                    if (err.response.status === 308) {
                        setRefreshJob(refresh => refresh + 1);
                    } else {
                        setErrorMsg(`A problem occurred while retrieving the stream entry. Error message: ${getResponseError(err)}`);
                    }
                });
        }
        if (refresh === 0) {
            fetchStreamEntry();
        } else {
            const streamEntryTimer = setTimeout(() => {
                fetchStreamEntry();
            }, 3000);
            return () => {
                clearTimeout(streamEntryTimer)
            }
        }
    }, [server, token, solveTraceEntry, refresh, setRefreshJob, jobFinished]);

    return (
        <>
            <div className="invalid-feedback" style={{ display: errorMsg !== "" ? "block" : "none" }}>
                {errorMsg}
            </div>
            <div className="chart-container" style={{ position: "relative" }}>
                <Line data={{
                    labels: data.map(el => el[0]),
                    datasets: [
                        {
                            label: "primal bound",
                            lineTension: 0,
                            backgroundColor: "#F39619",
                            borderColor: "#F39619",
                            fill: false,
                            data: data.map(el => el[1])
                        },
                        {
                            label: "dual bound",
                            lineTension: 0,
                            backgroundColor: "#272932",
                            borderColor: "#272932",
                            fill: false,
                            data: data.map(el => el[2])
                        }
                    ]
                }}
                    height={300}
                    options={{
                        elements: {
                            point: {
                                radius: 0
                            }
                        },
                        scales: {
                            xAxes: [{
                                display: true,
                                scaleLabel: {
                                    display: true,
                                    labelString: 'seconds'
                                }
                            }],
                            yAxes: [{
                                display: true,
                                scaleLabel: {
                                    display: true,
                                    labelString: 'Value'
                                }
                            }]
                        }
                    }} />
            </div>
        </>
    );
};

export default SolveTraceEntryView;
