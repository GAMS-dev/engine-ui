import React, { useContext } from "react";
import { Package, Users, Play, Archive, Server, ExternalLink } from "react-feather";
import { withRouter } from 'react-router-dom';
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import LogOutMenu from "./LogOutMenu";

const SidebarRaw = props => {
  const [{ roles }] = useContext(AuthContext);
  const pathname = props.location.pathname;
  return (
    <nav className="sidebar bg-light">
      <div className="sidebar-sticky">
        <ul className="nav flex-column nav-top d-md-block bg-light d-none">
          <LogOutMenu />
        </ul>
        <hr className="d-none d-md-block" />
        <ul className="nav sidebar-nav">
          <li className="nav-item">
            <Link to="/jobs" className={`nav-link nav-block${["/models", "/new-user", "/users",
              "/groups", "/cleanup", "/licenses", "/usage", "/instances", "/webhooks", "/quotas"].filter(el => pathname.startsWith(el)).length > 0 ? "" : " active"}`}>
              <Play className="feather" />
              <span className="nav-link-text">Jobs</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/models" className={`nav-link nav-block${["/models", "/groups"].filter(el => pathname.startsWith(el)).length > 0 ? " active" : ""}`}>
              <Package className="feather" />
              <span className="nav-link-text">Models</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/users" className={`nav-link nav-block${["/users", "/licenses", "/usage", "/new-user"].filter(el => pathname.startsWith(el)).length > 0 ? " active" : ""}`}>
              <Users className="feather" />
              <span className="nav-link-text">Users</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/webhooks" className={`nav-link nav-block${pathname.startsWith("/webhooks") ? " active" : ""}`}>
              <ExternalLink className="feather" />
              <span className="nav-link-text">Webhooks</span>
            </Link>
          </li>
          {(roles && roles.find(role => role === "admin") !== undefined) &&
            <>
              <li className="nav-item">
                <Link to="/cleanup" className={`nav-link nav-block${pathname === "/cleanup" ? " active" : ""}`}>
                  <Archive className="feather" />
                  <span className="nav-link-text">Cleanup</span>
                </Link>
              </li>
              {props.inKubernetes && <li className="nav-item">
                <Link to="/instances" className={`nav-link nav-block${pathname.startsWith("/instances") ? " active" : ""}`}>
                  <Server className="feather" />
                  <span className="nav-link-text">Instances</span>
                </Link>
              </li>}
            </>
          }
        </ul>
      </div>
    </nav>
  );
};

const Sidebar = withRouter(props => <SidebarRaw {...props} />);

export default Sidebar;
