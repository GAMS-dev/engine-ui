import React, { useContext } from "react";
import { Package, Users, Play, Archive, Settings, ExternalLink, Server } from "react-feather";
import { useLocation } from 'react-router-dom';
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import UserMenu from "./UserMenu";

const Sidebar = props => {
  const [{ roles }] = useContext(AuthContext);
  const pathname = useLocation().pathname;
  return (
    <nav className="sidebar bg-light">
      <div className="sidebar-sticky">
        <ul className="nav flex-column nav-top d-md-block bg-light d-none">
          <UserMenu />
        </ul>
        <hr className="d-none d-md-block" />
        <ul className="nav sidebar-nav">
          <li className="nav-item">
            <Link to="/jobs" className={`nav-link nav-block${["/models", "/new-user", "/users",
              "/groups", "/nsusers", "/cleanup", "/licenses", "/usage", "/pools", "/administration", "/webhooks", "/quotas"].filter(el => pathname.startsWith(el)).length > 0 ? "" : " active"}`}>
              <Play className="feather" />
              <span className="nav-link-text">Jobs</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/models" className={`nav-link nav-block${["/models", "/groups", "/nsusers"].filter(el => pathname.startsWith(el)).length > 0 ? " active" : ""}`}>
              <Package className="feather" />
              <span className="nav-link-text">Namespaces</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/users" className={`nav-link nav-block${["/users", "/licenses", "/usage", "/new-user"].filter(el => pathname.startsWith(el)).length > 0 ? " active" : ""}`}>
              <Users className="feather" />
              <span className="nav-link-text">Users</span>
            </Link>
          </li>
          {props.instancesVisible === true &&
            <li className="nav-item">
              <Link to="/pools" className={`nav-link nav-block${pathname.startsWith("/pools") ? " active" : ""}`}>
                <Server className="feather" />
                <span className="nav-link-text">Pools</span>
              </Link>
            </li>
          }
          {props.webhooksVisible === true && <li className="nav-item">
            <Link to="/webhooks" className={`nav-link nav-block${pathname.startsWith("/webhooks") ? " active" : ""}`}>
              <ExternalLink className="feather" />
              <span className="nav-link-text">Webhooks</span>
            </Link>
          </li>}
          <li className="nav-item">
            <Link to="/cleanup" className={`nav-link nav-block${pathname === "/cleanup" ? " active" : ""}`}>
              <Archive className="feather" />
              <span className="nav-link-text">Cleanup</span>
            </Link>
          </li>
          {roles && roles.find(role => role === "admin") !== undefined &&
            <li className="nav-item">
              <Link to="/administration" className={`nav-link nav-block${pathname.startsWith("/administration") ? " active" : ""}`}>
                <Settings className="feather" />
                <span className="nav-link-text">Administration</span>
              </Link>
            </li>
          }
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
