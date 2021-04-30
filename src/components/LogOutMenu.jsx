import React, { useContext } from "react";
import { User, LogOut } from "react-feather";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import QuotaWidget from "./QuotaWidget";


export const LogOutMenu = () => {
    const [{ username }] = useContext(AuthContext);
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
                <Link to={`/users/${username}/change-pass`}
                    className="btn nav-link nav-block btn-link btn-sm pt-md-0 pt-3 cp-button">
                    Change password
                </Link>
            </li>
        </>
    );
};

export default LogOutMenu;
