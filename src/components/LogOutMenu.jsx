import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { User, LogOut, MoreHorizontal } from "react-feather";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { ServerInfoContext } from "../ServerInfoContext";
import QuotaWidget from "./QuotaWidget";


export const LogOutMenu = () => {
    const [{ username }] = useContext(AuthContext);
    const [serverInfo] = useContext(ServerInfoContext);
    const [{ server }] = useContext(AuthContext);
    const [prefrencesAvailable, setPreferencesAvailable] = useState(false);
    useEffect(() => {
        const fetchInstanceData = async () => {
            const userInstances = await axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
            if (userInstances.data && userInstances.data.instances_available.length > 0) {
                setPreferencesAvailable(false);
                return;
            }
            const globalInstances = await axios.get(`${server}/usage/instances`);
            setPreferencesAvailable(globalInstances.data && globalInstances.data.length > 0);
        }
        if (serverInfo.in_kubernetes === true) {
            fetchInstanceData();
        }
    }, [serverInfo, server, username, setPreferencesAvailable])
    return (
        <>
            <li className="nav-item">
                <div className="username-sidebar nav-block">
                    <User className="feather" size={12} /> {username}
                    <QuotaWidget />
                </div>
                <Link to="/logout" className="nav-link nav-block text-danger float-right float-md-none pb-md-3 pt-md-3">
                    <LogOut className="feather" />
                    Sign Out
                </Link>
                {prefrencesAvailable ?
                    <>
                        <Dropdown
                            className="nav-link nav-block d-inline d-sm-none">
                            <Dropdown.Toggle variant="link"><MoreHorizontal /></Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Link to={`/users/${username}/change-pass`} className="dropdown-item" role="button">
                                    Change password
                                </Link>
                                <Link to={`/preferences`} className="dropdown-item" role="button">
                                    Preferences
                                </Link>
                            </Dropdown.Menu>
                        </Dropdown>
                        <Link to={`/users/${username}/change-pass`}
                            className="btn nav-link nav-block btn-link btn-sm pt-md-0 pt-3 cp-button d-none d-sm-inline d-md-block">
                            Change password
                        </Link>
                        <Link to={`/preferences`}
                            className="btn nav-link nav-block btn-link btn-sm pt-md-0 pt-3 cp-button mt-1 d-none d-sm-inline d-md-block">
                            Preferences
                        </Link>
                    </> : <Link to={`/users/${username}/change-pass`}
                            className="btn nav-link nav-block btn-link btn-sm pt-md-0 pt-3 cp-button d-none d-sm-inline d-md-block">
                            Change password
                        </Link>}
            </li>
        </>
    );
};

export default LogOutMenu;
