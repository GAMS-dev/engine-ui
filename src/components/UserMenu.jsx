import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { User } from "react-feather";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { ServerInfoContext } from "../ServerInfoContext";
import QuotaWidget from "./QuotaWidget";


export const UserMenu = () => {
    const [{ username }] = useContext(AuthContext);
    const [serverInfo] = useContext(ServerInfoContext);
    const [{ server }] = useContext(AuthContext);
    const [instancesAvailable, setInstancesAvailable] = useState(false);
    const [dropdownExpanded, setDropdownExpanded] = useState(false);
    useEffect(() => {
        const fetchInstanceData = async () => {
            const userInstances = await axios.get(`${server}/usage/instances/${encodeURIComponent(username)}`);
            if (userInstances.data && userInstances.data.instances_available.length > 0) {
                setInstancesAvailable(true);
                return;
            }
            const globalInstances = await axios.get(`${server}/usage/instances`);
            setInstancesAvailable(globalInstances.data && globalInstances.data.length > 0);
        }
        if (serverInfo.in_kubernetes === true) {
            fetchInstanceData();
        }
    }, [serverInfo, server, username, setInstancesAvailable])
    return (
        <>
            <li className="nav-item">
                <Dropdown show={dropdownExpanded}
                    onToggle={() => setDropdownExpanded(current => !!!current)}
                    className="d-inline">
                    <Dropdown.Toggle variant="link">
                        <User className="feather" size={12} />
                        <span className="username-container">{username}</span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <QuotaWidget isVisible={dropdownExpanded} className="dropdown-item dropdown-item-static small pe-none"/>
                        <Dropdown.Divider />
                        {instancesAvailable && <Link to='/preferences' className="dropdown-item" role="button">
                            <small>Set default instance</small>
                        </Link>}
                        <Link to={`/users/${username}/change-pass`} className="dropdown-item" role="button">
                            <small>Change password</small>
                        </Link>
                        <Link to='/logout' className="dropdown-item" role="button">
                            <small>Sign Out</small>
                        </Link>
                    </Dropdown.Menu>
                </Dropdown>
            </li>
        </>
    );
};

export default UserMenu;
