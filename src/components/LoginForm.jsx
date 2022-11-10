import React, { useContext, useCallback, useState } from "react";
import { generateRandomString, generatePKCEParams } from "./oauth";
import logo from "../assets/images/logo.svg";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { Navigate, Link } from "react-router-dom";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import { useEffect } from "react";
import { Nav } from "react-bootstrap";
import Alert from 'react-bootstrap/Alert';

const SERVER_NAME = process.env.REACT_APP_ENGINE_URL ? process.env.REACT_APP_ENGINE_URL : "/api";

const LoginForm = ({ showRegistrationForm }) => {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [server, setServer] = useState(SERVER_NAME);
  const [isValidInvitationCode, setIsValidInvitationCode] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationCodeIdentityProvider, setInvitationCodeIdentityProvider] = useState("");
  const [loginErrorMsg, setLoginErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [register, setRegister] = useState(showRegistrationForm === "true");
  const [showRegistrationSuccessAlert, setShowRegistrationSuccessAlert] = useState(false);

  const [OAuthConfig, setOAuthConfig] = useState([]);
  const [ldapConfig, setLDAPConfig] = useState([]);

  const [selectedAuthProvider, setSelectedAuthProvider] = useState("standard");

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

    const fetchAuthProviders = async (selectedProvider) => {
      try {
        const response = await axios.get(`${server}/auth/providers`);
        const OAuthConfigTmp = response.data.filter(config => config.oauth2 != null).map(config => {
          const newConfig = config;
          newConfig.oauth2.scopes = newConfig.oauth2.scopes.filter(
            scope_object => defaultScopes.includes(scope_object.scope)).map(scope_object => scope_object.request_scope);
          return newConfig;
        });
        const LDAPConfigTmp = response.data.filter(config => config.is_ldap_identity_provider === true);

        if (selectedProvider != null) {
          const selectedOAuthProvider = OAuthConfigTmp.filter(config => config.name === selectedProvider);
          if (selectedOAuthProvider.length > 0) {
            initiateOAuthLogin(selectedOAuthProvider[0]);
            return;
          }
          if (LDAPConfigTmp.findIndex(config => config.name === selectedProvider) !== -1) {
            setSelectedAuthProvider(selectedProvider);
          }
        }
        setOAuthConfig(OAuthConfigTmp);
        setLDAPConfig(LDAPConfigTmp);
      } catch (err) {
        setLoginErrorMsg(`Problems retrieving authentication providers. Error message: ${getResponseError(err)}.`);
      }
    }
    let selectedProvider = null;

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
    } else if (document.location.search.includes('provider=')) {
      const searchParams = new URLSearchParams(document.location.search);
      selectedProvider = searchParams.get('provider');
    }
    fetchAuthProviders(selectedProvider);
  }, [server, setLogin, loginUser]);

  useEffect(() => {
    setLoginErrorMsg('');
    if (invitationCode.length !== 36) {
      if (invitationCode.length !== 0) {
        setLoginErrorMsg('Invalid invitation code.');
      }
      setIsValidInvitationCode(false);
      return;
    }
    const fetchInvitationCodeMetadata = async () => {
      try {
        setIsValidInvitationCode(false);
        const response = await axios.get(`${server}/users/invitation/${invitationCode}`);
        setInvitationCodeIdentityProvider(response.data.identity_provider);
        const userSubject = response.data.identity_provider_user_subject;
        const usernameTmp = [];
        for (let i = 0; i < userSubject.length; i += 1) {
          const char = userSubject.charAt(i);
          if (!/^[a-zA-Z0-9_]+$/.test(char) || usernameTmp.length > 70) {
            break;
          }
          usernameTmp.push(char);
        }
        setUsername(usernameTmp.join(""));
        setIsValidInvitationCode(true);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setLoginErrorMsg('Invalid invitation code.');
        } else {
          setLoginErrorMsg(`Problems retrieving invitation code metadata. Error message: ${getResponseError(err)}.`);
        }
      }
    }
    fetchInvitationCodeMetadata();
  }, [server, invitationCode]);

  const initiateOAuthLogin = async (config) => {
    setIsSubmitting(true);
    const state = generateRandomString(32);
    const pkceParams = await generatePKCEParams();
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
  };


  const handleLogin = async () => {
    setShowRegistrationSuccessAlert(false);
    setIsSubmitting(true);
    try {
      let authResponse;
      if (selectedAuthProvider === "standard") {
        authResponse = await axios.post(`${server}/auth/login`,
          {
            username: username,
            password: password,
            expires_in: 604800
          }
        );
      } else {
        authResponse = await axios.post(`${server}/auth/ldap-providers/${encodeURIComponent(selectedAuthProvider)}/login`,
          {
            username: username,
            password: password,
            expires_in: 604800
          }
        );
      }
      loginUser(authResponse.data.token);
    } catch (err) {
      if (err.response == null || err.response.status !== 401) {
        setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
      } else {
        setLoginErrorMsg("Invalid username and/or password");
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  const handleRegistration = async () => {
    clearRegisterErrors();
    setShowRegistrationSuccessAlert(false);
    if (password !== confirmPassword) {
      setConfirmPasswordError("The password does not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const registrationForm = new FormData();
      registrationForm.append("username", username);
      registrationForm.append("invitation_code", invitationCode);
      if (invitationCodeIdentityProvider === "gams_engine") {
        registrationForm.append("password", password);
      }
      await axios.post(`${server}/users/`, registrationForm);
      if (invitationCodeIdentityProvider === "gams_engine") {
        handleLogin();
      } else if (ldapConfig.findIndex(config => config.name === invitationCodeIdentityProvider) !== -1) {
        setSelectedAuthProvider(invitationCodeIdentityProvider);
        setRegister(false);
        setShowRegistrationSuccessAlert(true);
      } else {
        const selectedOAuthProvider = OAuthConfig.filter(config => config.name === invitationCodeIdentityProvider);
        if (selectedOAuthProvider.length > 0) {
          initiateOAuthLogin(selectedOAuthProvider[0]);
          return;
        }
        setLoginErrorMsg("Invitation code is attached to authentication provider that no longer exists. You will not be able to log in.");
      }
    } catch (err) {
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
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="h3 mb-3 font-weight-normal">{register ? "Register" : "Please sign in"}</h1>
        <div className="invalid-feedback" style={{ display: loginErrorMsg != null ? "block" : "none" }}>
          {loginErrorMsg}
        </div>
        {showRegistrationSuccessAlert && <Alert variant="success">
          Registration successful, you can log in now!
        </Alert>}
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
          {register ? <div className="form-group">
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
          </div> :
            (ldapConfig.length > 0 ?
              <Nav variant="tabs" className="mb-3" activeKey={selectedAuthProvider} onSelect={k => setSelectedAuthProvider(k)}>
                <Nav.Item>
                  <Nav.Link eventKey="standard" title="Standard">Standard</Nav.Link>
                </Nav.Item>
                {ldapConfig.map(config =>
                  <Nav.Item key={config.name}>
                    <Nav.Link eventKey={config.name} title={config.label}>{config.label}</Nav.Link>
                  </Nav.Item>
                )}
              </Nav> : <></>)}
          {(!register || isValidInvitationCode) && <div className="form-group">
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
              onChange={e => setUsername(e.target.value)}
              required
            />
            <div className="invalid-feedback"> {usernameError} </div>
          </div>}
          {(!register || (isValidInvitationCode && invitationCodeIdentityProvider === "gams_engine")) && <div className="form-group">
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
          </div>}
          {register && invitationCodeIdentityProvider === "gams_engine" && <div className="form-group">
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
              onClick={() => initiateOAuthLogin(config)}>
              {config.label}
            </button>
          </div>
        })}
        <div className="mt-2">
          <small>
            <Link to={register ? "/login" : "/register"} onClick={() => {
              clearRegisterErrors();
              setRegister(current => !current);
            }}>{register ? "Login" : "Register"}</Link>
          </small>
        </div>
        {login ? <Navigate replace to="/" /> : ""}
      </form>
    </div>
  );
};

export default LoginForm;
