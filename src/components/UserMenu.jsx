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
                        {instancesAvailable && <Dropdown.Item as={Link} to='/default-instance'><small>Set default instance</small></Dropdown.Item>}
                        <Dropdown.Item as={Link} to='/settings'><small>Settings</small></Dropdown.Item>
                        <Dropdown.Item as={Link} to='/auth-token'><small>Create auth token</small></Dropdown.Item>
                        <Dropdown.Item as={Link} to={`/users/${username}/change-pass`}>
                            <small>Change password</small>
                        </Dropdown.Item>
                        <Dropdown.Item as={Link} to='/logout'>
                            <small>Sign Out</small>
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <QuotaWidget isVisible={dropdownExpanded} className="dropdown-item dropdown-item-static small pe-none" />
                    </Dropdown.Menu>
                </Dropdown>
            </li>
        </>
    );
};

export default UserMenu;
