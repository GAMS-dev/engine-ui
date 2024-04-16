import React, { useContext, useEffect, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { User } from "react-feather";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { ServerInfoContext } from "../ServerInfoContext";
import QuotaWidget from "./QuotaWidget";
import { getInstanceData } from "./util";


export const UserMenu = () => {
    const [{ server, username }] = useContext(AuthContext);
    const [serverInfo] = useContext(ServerInfoContext);
    const [instanceDataFetched, setInstanceDataFetched] = useState(false);
    const [instancesAvailable, setInstancesAvailable] = useState(false);
    const [dropdownExpanded, setDropdownExpanded] = useState(false);
    useEffect(() => {
        const fetchInstanceData = async () => {
            const userInstances = await getInstanceData(server, username);
            setInstancesAvailable(userInstances.instances.length > 0);
            setInstanceDataFetched(true);
        }
        if (dropdownExpanded !== true || instanceDataFetched) {
            return;
        }
        if (serverInfo.in_kubernetes === true) {
            fetchInstanceData();
        }
    }, [serverInfo, server, username, instanceDataFetched, dropdownExpanded])
    return (
        <>
            <li className="nav-item">
                <Dropdown show={dropdownExpanded}
                    onToggle={() => setDropdownExpanded(current => !current)}
                    className="d-inline">
                    <Dropdown.Toggle variant="link">
                        <User className="feather" size={12} />
                        <span className="username-container">{username}</span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {instancesAvailable && <Link to='/default-instance' className="dropdown-item" role="button">
                            <small>Set default instance</small>
                        </Link>}
                        <Link to="/settings" className="dropdown-item" role="button">
                            <small>Settings</small>
                        </Link>
                        <Link to='/auth-token' className="dropdown-item" role="button">
                            <small>Create auth token</small>
                        </Link>
                        <Link to={`/users/${username}/change-pass`} className="dropdown-item" role="button">
                            <small>Change password</small>
                        </Link>
                        <Link to='/logout' className="dropdown-item" role="button">
                            <small>Sign Out</small>
                        </Link>
                        <Dropdown.Divider />
                        <QuotaWidget isVisible={dropdownExpanded} className="dropdown-item dropdown-item-static small pe-none" />
                    </Dropdown.Menu>
                </Dropdown>
            </li>
        </>
    );
};

export default UserMenu;
