import React, { useContext, useState } from "react";
import logo from "../assets/images/logo.svg";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { Redirect, Link } from "react-router-dom";
import SubmitButton from "./SubmitButton";

const SERVER_NAME = process.env.REACT_APP_ENGINE_URL ? process.env.REACT_APP_ENGINE_URL : "/api";

const LoginForm = props => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(SERVER_NAME);
  const [invitationCode, setInvitationCode] = useState("");
  const [loginErrorMsg, setLoginErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const register = props.register === "true";

  const [login, setLogin] = useContext(AuthContext);

  function handleLogin() {
    setIsSubmitting(true);
    axios
      .post(
        `${server}/auth/login`,
        {
          username: username,
          password: password
        }
      )
      .then(res => {
        if (res.status !== 200) {
          setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
          setIsSubmitting(false);
          return;
        }
        const jwt = res.data.token;
        axios
          .get(
            `${server}/users/`,
            {
              params: {
                username: username
              },
              auth: {
                username,
                password
              },
              headers: { "X-Fields": "roles" }
            }
          )
          .then(res => {
            if (res.status === 200 && res.data.length === 1) {
              setLogin({ jwt, server, roles: res.data[0].roles, username: username });
            } else {
              setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
            }
          })
          .catch(err => {
            setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
          });
      })
      .catch(err => {
        if (err.response == null || err.response.status !== 401) {
          setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
        } else {
          setLoginErrorMsg("Invalid username and/or password");
        }
      });
    setIsSubmitting(false);
  }
  function handleRegistration() {
    setIsSubmitting(true);
    axios
      .post(
        `${server}/users/`,
        {
          username: username,
          password: password,
          invitation_code: invitationCode,
        }
      )
      .then(res => {
        if (res.status === 201) {
          handleLogin();
        } else {
          setLoginErrorMsg("Oops. Something went wrong! Please try again later..");
        }
      })
      .catch(err => {
        if (err.response == null || err.response.status !== 400) {
          setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
        } else {
          setLoginErrorMsg(err.response.data.message);
        }
      });
    setIsSubmitting(false);
  }

  function updateUsername(e) {
    setUsername(e.target.value);
  }

  function updatePassword(e) {
    setPassword(e.target.value);
  }

  function updateServer(e) {
    setServer(e.target.value);
  }

  function updateInvitationCode(e) {
    setInvitationCode(e.target.value);
  }

  return (
    <div className="text-center d-flex h-100">
      <form
        className="form-signin m-auto"
        onSubmit={e => {
          e.preventDefault();
          if (register) {
            handleRegistration();
          } else {
            handleLogin();
          }
          return false;
        }}
      >
        <img
          src={logo}
          className="bg-dark p-4 mb-4 rounded w-100"
          alt="GAMS Logo"
        />
        <h1 className="h3 mb-3 font-weight-normal">Please sign in</h1>
        <div className="invalid-feedback" style={{ display: loginErrorMsg != null ? "block" : "none" }}>
          {loginErrorMsg}
        </div>
        <fieldset disabled={isSubmitting}>
          {!SERVER_NAME.startsWith("/") && !SERVER_NAME.startsWith("http") &&
            <div className="form-group">
              <label htmlFor="inputServer" className="sr-only">
                Server
              </label>
              <input
                type="text"
                className="form-control"
                id="inputServer"
                placeholder="Server"
                autoComplete="on"
                value={server}
                onChange={updateServer}
                required
              />
            </div>
          }
          {register && <div className="form-group">
            <label htmlFor="inputInvitationCode" className="sr-only">
              Invitation code
            </label>
            <input
              type="text"
              className="form-control"
              id="inputInvitationCode"
              placeholder="Invitation code"
              value={invitationCode}
              onChange={updateInvitationCode}
              required
            />
          </div>}
          <div className="form-group">
            <label htmlFor="inputUsername" className="sr-only">
              Username
            </label>
            <input
              type="text"
              className="form-control"
              id="username"
              placeholder="Username"
              autoComplete="username"
              name="username"
              value={username}
              onChange={updateUsername}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="inputPassword" className="sr-only">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="Password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={updatePassword}
              required
            />
          </div>
        </fieldset>
        <SubmitButton isSubmitting={isSubmitting}>
          {register ? "Register" : "Login"}
        </SubmitButton>
        <div className="mt-2">
          <small>
            <Link to={register ? "/login" : "/register"}>{register ? "Login" : "Register"}</Link>
          </small>
        </div>
        {login ? <Redirect to="/" /> : ""}
      </form>
    </div>
  );
};

export default LoginForm;
