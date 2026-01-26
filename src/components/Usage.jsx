import React, { useEffect, useContext, useState } from "react";
import { useParams, useLocation, useOutletContext, useNavigate, Outlet } from "react-router-dom";
import { RefreshCw } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { Nav, Tab } from "react-bootstrap";
import { getResponseError, calcRemainingQuota } from "./util";
import { UserSettingsContext } from "./UserSettingsContext";


const Usage = () => {
    const { userToEditRoles } = useOutletContext();
    const { userToEdit } = useParams();
    const [data, setData] = useState([]);
    const [recursive, setRecursive] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
    const [endDate, setEndDate] = useState(new Date());
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server }] = useContext(AuthContext);
    const [remainingQuota, setRemainingQuota] = useState(0)
    const [userSettings,] = useContext(UserSettingsContext)
    const quotaUnit = userSettings.quotaUnit
    const quotaConversionFactor = userSettings.quotaConversionFactor

    const location = useLocation();
    const navigate = useNavigate();

    const userToEditIsInviter = userToEditRoles.includes('admin') || userToEditRoles.includes('inviter');

    useEffect(() => {
        if (userToEditIsInviter == null) {
            return;
        }
        const fetchData = async () => {
            setIsLoading(true);
            let usageData;
            try {
                usageData = (await axios
                    .get(`${server}/usage/`, {
                        params: {
                            recursive: userToEditIsInviter ? recursive : false,
                            username: userToEdit,
                            from_datetime: startDate,
                            to_datetime: endDate
                        },
                        headers: {
                            "X-Fields": "job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}},pool_usage{*}"
                        }
                    })).data
            } catch (err) {
                setAlertMsg(`Problems fetching usage information. Error message: ${getResponseError(err)}`);
                setIsLoading(false);
                return;
            }
            setData(usageData)
            setIsLoading(false);
        }
        fetchData();
    }, [jwt, server, refresh, setAlertMsg, userToEdit, recursive, startDate, endDate, userToEditIsInviter]);

    useEffect(() => {
        const getRemainingQuota = async () => {
            try {
                const result = await axios({
                    url: `${server}/usage/quota`,
                    method: "GET",
                    params: { username: userToEdit }
                });
                if (result.data && result.data.length) {
                    const quotaRemaining = calcRemainingQuota(result.data);
                    setRemainingQuota(new Intl.NumberFormat('en-US', { style: 'decimal' }).format(quotaRemaining.volume / quotaConversionFactor))
                } else {
                    setRemainingQuota("unlimited")
                }
            } catch (err) {
                setAlertMsg(`Problems fetching quota data. Error message: ${getResponseError(err)}`)
            }
        }
        getRemainingQuota()
    }, [server, setAlertMsg, userToEdit, quotaConversionFactor]);
    return (
        <>
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <div className="h2">
                        <div className="h6 m-1">
                            Remaining Quota: {remainingQuota} {((remainingQuota !== "unlimited") ? quotaUnit : null)}
                        </div>
                    </div>

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
                {userToEditIsInviter &&
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
                <Tab.Container defaultActiveKey="dashboard" activeKey={location.pathname.split('/').pop()} onSelect={(key) => navigate(key)}>
                    <Nav className="nav-tabs">
                        <Nav.Item>
                            <Nav.Link eventKey="dashboard">Dashboard</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="timeline">Timeline</Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Tab.Container>
                <Tab.Content>
                    <Outlet context={{ data, startDate, endDate, isLoading }} />
                </Tab.Content>
            </div>
        </>
    );
};

export default Usage;
