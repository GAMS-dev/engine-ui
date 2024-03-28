import React, { useContext, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { User } from "react-feather";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import QuotaWidget from "./QuotaWidget";


export const UserMenu = () => {
    const [{ username }] = useContext(AuthContext);
    const [dropdownExpanded, setDropdownExpanded] = useState(false);
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
