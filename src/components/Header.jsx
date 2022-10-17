import React, { useEffect, useState, useContext } from "react";
import { Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.svg";
import { ServerInfoContext } from "../ServerInfoContext";
import LogOutMenu from "./LogOutMenu";

const Header = props => {
  const { licenseExpiration, isAdmin } = props;
  const [serverInfo] = useContext(ServerInfoContext);
  const [expiresIn, setExpiresIn] = useState(0);
  const [licenseValid, setLicenseValid] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      if (licenseExpiration === "perpetual") {
        setExpiresIn(null);
        setLicenseValid(true);
      } else if (licenseExpiration) {
        setExpiresIn(Math.ceil((Date.parse(licenseExpiration) - new Date()) / (1000 * 60 * 60 * 24)));
        setLicenseValid(true);
      } else if (licenseExpiration === null) {
        setExpiresIn(null);
        setLicenseValid(false);
      }
    }
  }, [licenseExpiration, isAdmin])

  return (
    <>
      <header className="navbar navbar-expand-lg navbar-dark bg-secondary border-bottom border-primary fixed-top shadow">
        {isAdmin && expiresIn !== 0 && <div className={`info-header ${(expiresIn < 31 && !(licenseValid && expiresIn === null)) ? "text-error font-weight-bold" : "text-light"}`}>
          {expiresIn == null ? (licenseValid ? "Perpetual license" : "No license") : (expiresIn < 0 ? "License expired" : `License expires in: ${expiresIn} days`)}
        </div>}
        {serverInfo && <div className="info-header info-header-right text-light">
          {`${serverInfo.version} / GAMS ${serverInfo.gams_version}`}
        </div>}
        <Link to="/" className="navbar-brand m-auto d-none d-md-block">
          <img src={logo} className="navbar-logo" alt="GAMS Logo" />
          {serverInfo.in_kubernetes === true &&
          <Badge id="logoPostfix" pill variant="primary">{window.location.hostname.endsWith("engine.gams.com")? "SaaS": "K"}</Badge>}
        </Link>
      </header>
      <ul className="nav flex-column nav-top d-block bg-light d-md-none">
        <LogOutMenu />
      </ul>
    </>
  );
};

export default Header;
