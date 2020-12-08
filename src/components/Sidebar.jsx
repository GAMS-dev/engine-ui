import React, { useContext } from "react";
import { Package, User, Users, LogOut, Play, Archive } from "react-feather";
import { withRouter } from 'react-router-dom';
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";

const SidebarRaw = props => {
  const [{ roles, username }] = useContext(AuthContext);
  const pathname = props.location.pathname;

  const logOutMenu = <>
    <li className="nav-item">
      <div className="username-sidebar nav-block">
        <User className="feather" size={12} /> {username}
      </div>
      <Link to="/logout" className="nav-link nav-block text-danger float-right float-md-none pb-md-3 pt-md-3">
        <LogOut className="feather" />
        Sign Out
      </Link>
      <button
        type="button"
        className="btn nav-link nav-block btn-link btn-sm pt-md-0 pt-3 cp-button"
        onClick={props.changePasswordHandler}>
        Change password
      </button>
    </li>
  </>
  return (
    <nav className="sidebar bg-light">
      <ul className="nav flex-column nav-top bg-light d-md-none">
        {logOutMenu}
      </ul>
      <div className="sidebar-sticky">
        <ul className="nav flex-column nav-top d-md-block bg-light d-none">
          {logOutMenu}
        </ul>
        <hr className="d-none d-md-block" />
        <ul className="nav sidebar-nav">
          <li className="nav-item">
            <Link to="/jobs" className={`nav-link nav-block${["/models", "/new-model", "/new-user", "/users", "/cleanup", "/licenses", "/usage"].filter(el => pathname.startsWith(el)).length > 0 ? "" : " active"}`}>
              <Play className="feather" />
              <span className="nav-link-text">Jobs</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/models" className={`nav-link nav-block${["/models", "/new-model"].filter(el => pathname.startsWith(el)).length > 0 ? " active" : ""}`}>
              <Package className="feather" />
              <span className="nav-link-text">Models</span>
            </Link>
          </li>
          {(roles && roles.length > 0) &&
            <li className="nav-item">
              <Link to="/users" className={`nav-link nav-block${["/users", "/licenses", "/usage", "/new-user"].filter(el => pathname.startsWith(el)).length > 0 ? " active" : ""}`}>
                <Users className="feather" />
                <span className="nav-link-text">Users</span>
              </Link>
            </li>}
          {(roles && roles.find(role => role === "admin") !== undefined) &&
            <li className="nav-item">
              <Link to="/cleanup" className={`nav-link nav-block${pathname === "/cleanup" ? " active" : ""}`}>
                <Archive className="feather" />
                <span className="nav-link-text">Cleanup</span>
              </Link>
            </li>
          }
        </ul>
      </div>
    </nav>
  );
};

const Sidebar = withRouter(props => <SidebarRaw {...props} />);

export default Sidebar;
