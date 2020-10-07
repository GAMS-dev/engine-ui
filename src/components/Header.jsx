import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.svg";

const Header = props => {
  return (
    <header className="navbar navbar-expand-lg navbar-dark bg-secondary border-bottom border-primary fixed-top shadow">
      <Link to="/" className="navbar-brand m-auto">
        <img src={logo} className="navbar-logo" alt="GAMS Logo" />
      </Link>
    </header>
  );
};

export default Header;
