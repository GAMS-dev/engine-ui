import React, { useContext, useCallback, useState } from "react";
import { randomBytes } from "crypto";
import { generatePKCEParams } from "./oauth";
import logo from "../assets/images/logo.svg";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { Redirect, Link } from "react-router-dom";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import { useEffect } from "react";

const SERVER_NAME = process.env.REACT_APP_ENGINE_URL ? process.env.REACT_APP_ENGINE_URL : "/api";

const LoginForm = props => {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [server, setServer] = useState(SERVER_NAME);
  const [invitationCode, setInvitationCode] = useState("");
  const [loginErrorMsg, setLoginErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const register = props.register === "true";

  const [OAuthConfig, setOAuthConfig] = useState([]);

  const [login, setLogin] = useContext(AuthContext);

  function clearRegisterErrors() {
    setUsernameError(false);
    setPasswordError(false);
    setConfirmPasswordError(false);
  }

  const loginUser = useCallback(async (jwt) => {
    if (jwt == null) {
      return;
    }
    try {
      const reponse = await axios.get(`${server}/users/`, {
        params: {
          'everyone': false
        },
        headers: {
          "X-Fields": "username,roles",
          "Authorization": "Bearer " + jwt
        }
      });
      setIsSubmitting(false);
      if (reponse.data.length === 1) {
        setLogin({ jwt, server, roles: reponse.data[0].roles, username: reponse.data[0].username });
      } else {
        setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
      }
    } catch (err) {
      setLoginErrorMsg(`Some error occurred while trying to retrieve user information from Engine. Error message: ${getResponseError(err)}.`);
      setIsSubmitting(false);
    }
  }, [server, setLogin]);

  useEffect(() => {
      const defaultScopes = ['NAMESPACES', 'JOBS', 'USERS', 'HYPERCUBE', 'CLEANUP', 'LICENSES', 'USAGE'];
      const oauthLogin = async (authParams, code) => {
      if (code == null) {
        setLoginErrorMsg('Internal error while retrieving authentication token from OAuth provider.');
        setIsSubmitting(false);
        return;
      }
      try {
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('client_id', authParams.clientId);
        params.append('redirect_uri', window.location.origin);
        params.append('code_verifier', authParams.codeVerifier);
        params.append('code', code);
        const response = await axios.post(authParams.tokenEndpoint, params);
        const jwt = response.data.access_token;
        if (jwt == null) {
          setLoginErrorMsg('Internal error while retrieving authentication token from OAuth provider.');
          setIsSubmitting(false);
          return;
        }
        loginUser(jwt);
      } catch (err) {
        setLoginErrorMsg(`Problems retrieving authentication token from OAuth provider. Error message: ${getResponseError(err)}.`);
        setIsSubmitting(false);
      }
    }

    const fetchAuthProviders = async () => {
      try {
        const response = await axios.get(`${server}/auth/providers`);
        setOAuthConfig(response.data.filter(config => Object.keys(config).includes('oauth2')).map(config => {
          const newConfig = config;
          newConfig.oauth2.scopes = newConfig.oauth2.scopes.filter(
              scope_object => defaultScopes.includes(scope_object.scope)).map(scope_object => scope_object.request_scope);
          return newConfig;
        }))
      } catch (err) {
        setLoginErrorMsg(`Problems retrieving authentication providers. Error message: ${getResponseError(err)}.`);
      }
    }

    if (document.location.search.includes('state=')) {
      setIsSubmitting(true);
      const searchParams = new URLSearchParams(document.location.search);
      const authParams = JSON.parse(sessionStorage.getItem('authParams'));
      sessionStorage.removeItem('authParams');
      if (authParams != null && authParams.state === searchParams.get('state')) {
        const code = searchParams.get('code');
        oauthLogin(authParams, code);
      } else {
        setIsSubmitting(false);
      }
    }
    fetchAuthProviders();
  }, [server, setLogin, loginUser]);


  function handleLogin() {
    setIsSubmitting(true);
    axios
      .post(
        `${server}/auth/login`,
        {
          username: username,
          password: password,
          expires_in: 604800
        }
      )
      .then(res => {
        if (res.status !== 200) {
          setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
          setIsSubmitting(false);
          return;
        }
        loginUser(res.data.token);
      })
      .catch(err => {
        if (err.response == null || err.response.status !== 401) {
          setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
        } else {
          setLoginErrorMsg("Invalid username and/or password");
        }
        setIsSubmitting(false);
      });
  }
  function handleRegistration() {
    clearRegisterErrors();
    if (password !== confirmPassword) {
      setConfirmPasswordError("The password does not match.");
      return;
    }
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
        setIsSubmitting(false);
        if (res.status === 201) {
          handleLogin();
        } else {
          setLoginErrorMsg("Oops. Something went wrong! Please try again later..");
        }
      })
      .catch(err => {
        setIsSubmitting(false);
        if (err.response == null || err.response.status !== 400) {
          setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
        } else {
          setLoginErrorMsg(err.response.data.message);
          if (err.response.data.hasOwnProperty('errors')) {
            if (err.response.data.errors.hasOwnProperty('username')) {
              setUsernameError(err.response.data.errors.username);
            }
            if (err.response.data.errors.hasOwnProperty('password')) {
              setPasswordError(err.response.data.errors.password);
            }
          }
        }
      });
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
                onChange={e => setServer(e.target.value)}
                required
              />
            </div>
          }
          {register && <div className="form-group">
            <label htmlFor="inputInvitationCode" className="sr-only">
              Invitation Code
            </label>
            <input
              type="text"
              className="form-control"
              id="inputInvitationCode"
              placeholder="Invitation code"
              value={invitationCode}
              onChange={e => setInvitationCode(e.target.value)}
              required
            />
          </div>}
          <div className="form-group">
            <label htmlFor="inputUsername" className="sr-only">
              Username
            </label>
            <input
              type="text"
              className={"form-control" + (usernameError ? " is-invalid" : "")}
              id="username"
              placeholder="Username"
              autoComplete="username"
              name="username"
              value={username}
              onChange={e => setUsername(e.target.value.trim())}
              required
            />
            <div className="invalid-feedback"> {usernameError} </div>
          </div>
          <div className="form-group">
            <label htmlFor="inputPassword" className="sr-only">
              Password
            </label>
            <input
              type="password"
              className={"form-control" + (passwordError ? " is-invalid" : "")}
              id="password"
              placeholder="Password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <div className="invalid-feedback"> {passwordError} </div>
          </div>
          {register && <div className="form-group">
            <label htmlFor="confirmPassword" className="sr-only">
              Confirm Password
            </label>
            <input
              type="password"
              className={"form-control" + (confirmPasswordError ? " is-invalid" : "")}
              id="confirmPassword"
              placeholder="Confirm Password"
              autoComplete="current-password"
              name="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            <div className="invalid-feedback"> {confirmPasswordError} </div>
          </div>}
        </fieldset>
        <SubmitButton isSubmitting={isSubmitting}>
          {register ? "Register" : "Login"}
        </SubmitButton>
        {register ? <></> : OAuthConfig.map((config, idx) => {
          return <div key={`oauth_button_${idx}`} className="mt-2">
            <button type="button" disabled={isSubmitting} className='btn btn-sm btn-secondary btn-block'
              onClick={() => {
                setIsSubmitting(true);
                const state = randomBytes(32).toString('hex');
                const pkceParams = generatePKCEParams();
                const queryParams = [
                  'response_type=code',
                  `client_id=${encodeURIComponent(config.oauth2.web_ui_client_id)}`,
                  `scope=${encodeURIComponent(config.oauth2.scopes.join(' '))}`,
                  `state=${state}`,
                  `redirect_uri=${encodeURIComponent(window.location.origin)}`,
                  `code_challenge=${pkceParams.codeChallenge}`,
                  'code_challenge_method=S256'
                ];
                sessionStorage.setItem('authParams', JSON.stringify({
                  clientId: config.oauth2.web_ui_client_id,
                  tokenEndpoint: config.oauth2.token_endpoint,
                  codeChallenge: pkceParams.codeChallenge,
                  codeVerifier: pkceParams.codeVerifier,
                  state
                }));
                window.location.replace(`${config.oauth2.authorization_endpoint}?${queryParams.join('&')} `);
              }}>
              {config.label}
            </button>
          </div>
        })}
        <div className="mt-2">
          <small>
            <Link to={register ? "/login" : "/register"} onClick={clearRegisterErrors}>{register ? "Login" : "Register"}</Link>
          </small>
        </div>
        {login ? <Redirect to="/" /> : ""}
      </form>
    </div>
  );
};

export default LoginForm;
