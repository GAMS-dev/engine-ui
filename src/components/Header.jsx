import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.svg";

const Header = props => {
  const { licenseExpiration, isAdmin } = props;
  const [expiresIn, setExpiresIn] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      if (licenseExpiration) {
        setExpiresIn(Math.ceil((Date.parse(licenseExpiration) - new Date()) / (1000 * 60 * 60 * 24)));
      } else if (licenseExpiration === null) {
        setExpiresIn(null);
      }
    }
  }, [licenseExpiration, isAdmin])

  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-secondary border-bottom border-primary fixed-top shadow">
      {isAdmin && expiresIn !== 0 && <div className={`info-header ${expiresIn < 31 ? "text-error font-weight-bold" : "text-light"}`}>
        {expiresIn == null ? "No license" : (expiresIn < 0 ? "License expired" : `License expires in: ${expiresIn} days`)}
      </div>}
      <Link to="/" className="navbar-brand m-auto">
        <img src={logo} className="navbar-logo" alt="GAMS Logo" />
      </Link>
    </header>
  );
};

export default Header;
