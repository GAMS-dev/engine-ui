import React, { useContext } from "react";
import { Package, User, LogOut, Play, Archive } from "react-feather";
import { withRouter } from 'react-router-dom';
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";

const SidebarRaw = props => {
  const [{ roles }] = useContext(AuthContext);
  const pathname = props.location.pathname;

  const logOutMenu = <>
    <li className="nav-item">
      <Link to="/logout" className="nav-link text-danger float-right float-md-none pb-md-3">
        <LogOut className="feather" />
        LogOut
      </Link>
      <button
        type="button"
        className="btn nav-link btn-link btn-sm pt-md-0 pt-3"
        style={{ fontSize: "0.8em", padding: "0 1em" }}
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
            <Link to="/jobs" className={`nav-link${["/models", "/users", "/cleanup"].includes(pathname) ? "" : " active"}`}>
              <Play className="feather" />
              <span className="nav-link-text">Jobs</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/models" className={`nav-link${pathname === "/models" ? " active" : ""}`}>
              <Package className="feather" />
              <span className="nav-link-text">Models</span>
            </Link>
          </li>
          {(roles && roles.length > 0) &&
            <li className="nav-item">
              <Link to="/users" className={`nav-link${pathname === "/users" ? " active" : ""}`}>
                <User className="feather" />
                <span className="nav-link-text">Users</span>
              </Link>
            </li>}
          {(roles && roles.find(role => role === "admin") !== undefined) &&
            <li className="nav-item">
              <Link to="/cleanup" className={`nav-link${pathname === "/cleanup" ? " active" : ""}`}>
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
