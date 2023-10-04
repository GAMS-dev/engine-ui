import React, { useContext, useCallback, useState } from "react";
import logo from "../assets/images/logo.svg";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { sessionTokenExpirationSeconds } from "./constants";
import { Navigate, Link } from "react-router-dom";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import { useEffect } from "react";
import { Nav } from "react-bootstrap";
import Alert from 'react-bootstrap/Alert';
import OAuth2Login from "./OAuth2Login";
import { ClipLoader } from "react-spinners";
import ShowHidePasswordInput from "./ShowHidePasswordInput";

const SERVER_NAME = process.env.REACT_APP_ENGINE_URL ? process.env.REACT_APP_ENGINE_URL : "/api";

const LoginForm = ({ showRegistrationForm }) => {
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [server, setServer] = useState(SERVER_NAME);
  const [invitationTokenHasSub, setInvitationTokenHasSub] = useState(false);
  const [isValidInvitationCode, setIsValidInvitationCode] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [invitationCodeValidated, setInvitationCodeValidated] = useState("");
  const [invitationCodeIdentityProvider, setInvitationCodeIdentityProvider] = useState("");
  const [loginErrorMsg, setLoginErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthProcessing, setIsOAuthProcessing] = useState(document.location.search.includes('state='));
  const [register, setRegister] = useState(showRegistrationForm === "true");
  const [showRegistrationSuccessAlert, setShowRegistrationSuccessAlert] = useState(false);

  const [OAuthConfig, setOAuthConfig] = useState([]);
  const [ldapConfig, setLDAPConfig] = useState([]);

  const [selectedAuthProvider, setSelectedAuthProvider] = useState("gams_engine");

  const [OAuthLoginConfig, setOAuthLoginConfig] = useState(null);
  const [OAuthToken, setOAuthToken] = useState(null);
  const [OAuthErrorMsg, setOAuthErrorMsg] = useState("");

  const [login, setLogin] = useContext(AuthContext);

  function clearRegisterErrors() {
    setLoginErrorMsg("");
    setUsernameError(false);
    setPasswordError(false);
    setConfirmPasswordError(false);
  }

  const loginUser = useCallback(async (token) => {
    if (token?.jwt == null) {
      return;
    }
    let jwt = token.jwt;
    if (token?.isIdToken === true) {
      try {
        const oidcLoginResponse = await axios.post(`${server}/auth/oidc-providers/login`, {
          id_token: jwt,
          expires_in: sessionTokenExpirationSeconds
        });
        jwt = oidcLoginResponse?.data?.token;
        if (jwt == null) {
          setLoginErrorMsg('Internal error while retrieving authentication token from Engine.');
          setIsSubmitting(false);
          setIsOAuthProcessing(false);
          return;
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          setLoginErrorMsg("There does not appear to be a GAMS Engine user associated with your account. Please register first.");
        } else {
          setLoginErrorMsg(`Problems retrieving authentication token from Engine. Error message: ${getResponseError(err)}.`);
        }
        setIsSubmitting(false);
        setIsOAuthProcessing(false);
        return;
      }
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
      if (reponse.data.length === 1) {
        setLogin({
          jwt,
          server,
          roles: reponse.data[0].roles,
          username: reponse.data[0].username,
          isOAuthToken: token?.isOAuthToken,
          refreshTokenData: token?.refreshTokenData
        });
      } else {
        setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
      }
    } catch (err) {
      if (token?.isOAuthToken === true && err?.response?.status === 401) {
        setLoginErrorMsg("There does not appear to be a GAMS Engine user associated with your account. Please register first.");
      } else {
        setLoginErrorMsg(`Some error occurred while trying to retrieve user information from Engine. Error message: ${getResponseError(err)}.`);
      }
      setIsSubmitting(false);
      setIsOAuthProcessing(false);
    }
  }, [server, setLogin]);

  const handleLogin = async () => {
    setShowRegistrationSuccessAlert(false);
    setIsSubmitting(true);
    try {
      let authResponse;
      if (selectedAuthProvider === "gams_engine") {
        authResponse = await axios.post(`${server}/auth/login`,
          {
            username: username,
            password: password,
            expires_in: sessionTokenExpirationSeconds
          }
        );
      } else {
        authResponse = await axios.post(`${server}/auth/ldap-providers/${encodeURIComponent(selectedAuthProvider)}/login`,
          {
            username: username,
            password: password,
            expires_in: sessionTokenExpirationSeconds
          }
        );
      }
      loginUser({ jwt: authResponse.data.token });
    } catch (err) {
      if (err.response == null || err.response.status !== 401) {
        setLoginErrorMsg("Some error occurred while trying to connect to the Engine Server. Please try again later.");
      } else {
        setLoginErrorMsg("Invalid username and/or password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleRegistration = async () => {
    const getIdentityProviderInfo = async (providerName) => {
      if (providerName === "gams_engine") {
        return {
          "type": "gams_engine",
          "config": null
        };
      }
      const selectedLDAPProvider = ldapConfig.filter(config => config.name === providerName);
      if (selectedLDAPProvider.length > 0) {
        return {
          "type": "ldap",
          "config": selectedLDAPProvider[0]
        };
      }
      const selectedOAuthProvider = OAuthConfig.filter(config => config.name === providerName);
      if (selectedOAuthProvider.length > 0) {
        return {
          "type": "oauth",
          "config": selectedOAuthProvider[0]
        };
      }
      try {
        const response = await axios.get(`${server}/auth/providers`, { params: { name: providerName } });
        if (response.data.length === 0) {
          setLoginErrorMsg("Invitation code is attached to authentication provider that no longer exists.");
          return false;
        }
        const providerConfig = response.data[0];
        if (providerConfig.oauth2 != null || providerConfig.oidc != null) {
          return {
            "type": "oauth",
            "config": providerConfig
          };
        }
        if (providerConfig.is_ldap_identity_provider === true) {
          return {
            "type": "ldap",
            "config": providerConfig
          };
        }
      } catch (err) {
        setLoginErrorMsg(`Problems retrieving configuration of authentication provider: ${providerName}. Error message: ${getResponseError(err)}.`);
        return false;
      }
    }
    if (!isValidInvitationCode) {
      return;
    }
    clearRegisterErrors();
    setShowRegistrationSuccessAlert(false);
    setIsSubmitting(true);

    let providerInfo;

    providerInfo = await getIdentityProviderInfo(invitationCodeIdentityProvider);
    if (providerInfo === false) {
      setIsSubmitting(false);
      return;
    }
    if (providerInfo.type === "gams_engine" && password !== confirmPassword) {
      setConfirmPasswordError("The password does not match.");
      setIsSubmitting(false);
      return;
    }
    if (providerInfo.type === "oauth" && invitationTokenHasSub !== true && OAuthToken == null) {
      sessionStorage.setItem("registrationData", JSON.stringify({
        username,
        invitationCode,
        invitationCodeIdentityProvider
      }));
      setOAuthLoginConfig(providerInfo.config);
      return;
    }
    const registrationForm = new FormData();
    registrationForm.append("username", username);
    registrationForm.append("invitation_code", invitationCode);
    if (OAuthToken?.jwt != null) {
      registrationForm.append("identification_token", OAuthToken?.jwt);
    }
    if (providerInfo.type === "gams_engine") {
      registrationForm.append("password", password);
    }
    try {
      await axios.post(`${server}/users/`, registrationForm);
      if (providerInfo.type === "gams_engine") {
        await handleLogin();
      } else if (providerInfo.type === "ldap") {
        setSelectedAuthProvider(invitationCodeIdentityProvider);
        setRegister(false);
        setShowRegistrationSuccessAlert(true);
        setIsSubmitting(false);
      } else {
        if (invitationTokenHasSub === true) {
          setOAuthLoginConfig(providerInfo.config);
        } else {
          loginUser(OAuthToken);
        }
      }
    } catch (err) {
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
    }
  };

  useEffect(() => {
    const fetchAuthProviders = async (selectedProvider) => {
      let response;
      try {
        response = await axios.get(`${server}/auth/providers`);
      } catch (err) {
        setLoginErrorMsg(`Problems retrieving authentication providers. Error message: ${getResponseError(err)}.`);
        return;
      }
      const OAuthConfigTmp = response.data.filter(config => config.oauth2 != null || config.oidc != null);
      const LDAPConfigTmp = response.data.filter(config => config.is_ldap_identity_provider === true);

      if (selectedProvider != null) {
        let selectedProviderFound = false;
        const selectedOAuthProvider = OAuthConfigTmp.filter(config => config.name === selectedProvider);
        if (selectedOAuthProvider.length > 0) {
          setOAuthLoginConfig(selectedOAuthProvider[0]);
          return;
        }
        if (LDAPConfigTmp.findIndex(config => config.name === selectedProvider) !== -1) {
          setSelectedAuthProvider(selectedProvider);
          selectedProviderFound = true;
        }
        if (!selectedProviderFound) {
          try {
            response = await axios.get(`${server}/auth/providers`, { params: { name: selectedProvider } });
          } catch (err) {
            setLoginErrorMsg(`Problems retrieving configuration of authentication provider: ${selectedProvider}. Error message: ${getResponseError(err)}.`);
            return;
          }
          if (response.data.length > 0) {
            const providerConfig = response.data[0];
            if (providerConfig.oauth2 != null || providerConfig.oidc != null) {
              setOAuthLoginConfig(providerConfig);
              return;
            }
            if (providerConfig.is_ldap_identity_provider) {
              LDAPConfigTmp.push(providerConfig);
              setSelectedAuthProvider(providerConfig);
            }
          }
        }
      }
      setOAuthConfig(OAuthConfigTmp);
      setLDAPConfig(LDAPConfigTmp);
    }
    let selectedProvider = null;

    if (document.location.search.includes('provider=')) {
      const searchParams = new URLSearchParams(document.location.search);
      selectedProvider = searchParams.get('provider');
    }
    fetchAuthProviders(selectedProvider);
  }, [server]);

  useEffect(() => {
    if (invitationCode.length !== 36) {
      if (invitationCode.length !== 0) {
        setLoginErrorMsg('Invalid invitation code.');
      }
      setInvitationCodeValidated(invitationCode);
      setIsValidInvitationCode(false);
      return;
    }
    if (invitationCodeValidated === invitationCode) {
      return;
    }
    setLoginErrorMsg('');
    const fetchInvitationCodeMetadata = async () => {
      try {
        const response = await axios.get(`${server}/users/invitation/${invitationCode}`);
        if (response.data.identity_provider == null) {
          setLoginErrorMsg('Invalid invitation code: Identity provider has been deleted.');
          setIsValidInvitationCode(false);
          return;
        }
        setInvitationCodeIdentityProvider(response.data.identity_provider);
        const userSubject = response.data.identity_provider_user_subject;
        if (userSubject == null) {
          setInvitationTokenHasSub(false);
        } else {
          setInvitationTokenHasSub(true);
          const usernameTmp = [];
          for (let i = 0; i < userSubject.length; i += 1) {
            const char = userSubject.charAt(i);
            if (!/^[a-zA-Z0-9_]+$/.test(char) || usernameTmp.length > 70) {
              break;
            }
            usernameTmp.push(char);
          }
          setUsername(usernameTmp.join(""));
        }
        setInvitationCodeValidated(invitationCode);
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
  }, [server, invitationCode, invitationCodeValidated]);

  useEffect(() => {
    setLoginErrorMsg(OAuthErrorMsg);
    if (OAuthErrorMsg === "") {
      return;
    }
    setOAuthToken(null);
    const registrationData = JSON.parse(sessionStorage.getItem("registrationData"));
    if (registrationData != null) {
      sessionStorage.removeItem("registrationData");
      setInvitationCodeValidated(registrationData.invitationCode);
      setInvitationCode(registrationData.invitationCode);
      setIsValidInvitationCode(true);
      setInvitationCodeIdentityProvider(registrationData.invitationCodeIdentityProvider);
      setUsername(registrationData.username);
      setInvitationTokenHasSub(true);
      setRegister(true);
    }
    setIsOAuthProcessing(false);
  }, [OAuthErrorMsg]);

  useEffect(() => {
    const registerAndLoginUser = async () => {
      const registrationData = JSON.parse(sessionStorage.getItem("registrationData"));
      if (registrationData != null) {
        sessionStorage.removeItem("registrationData");
        // need to complete registration first
        const registrationForm = new FormData();
        registrationForm.append("username", registrationData.username);
        registrationForm.append("invitation_code", registrationData.invitationCode);
        registrationForm.append("identification_token", OAuthToken.jwt);
        try {
          await axios.post(`${server}/users/`, registrationForm);
        } catch (err) {
          setInvitationCodeValidated(registrationData.invitationCode);
          setInvitationCode(registrationData.invitationCode);
          setIsValidInvitationCode(true);
          setInvitationCodeIdentityProvider(registrationData.invitationCodeIdentityProvider);
          setUsername(registrationData.username);
          setInvitationTokenHasSub(true);
          setRegister(true);
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
          setIsSubmitting(false);
          setIsOAuthProcessing(false);
          return;
        }
      }
      loginUser(OAuthToken);
    }
    if (OAuthToken?.jwt == null) {
      return;
    }
    registerAndLoginUser();
  }, [server, OAuthToken, loginUser]);

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
        {isOAuthProcessing ?
          <ClipLoader /> :
          <>
            <h1 className="h3 mb-3 fw-normal">{register ? "Register" : "Please sign in"}</h1>
            <div className="invalid-feedback" style={{ display: loginErrorMsg != null ? "block" : "none" }}>
              {loginErrorMsg}
            </div>
            {showRegistrationSuccessAlert && <Alert variant="success">
              Registration successful, you can log in now!
            </Alert>}
            <fieldset disabled={isSubmitting}>
              {!SERVER_NAME.startsWith("/") && !SERVER_NAME.startsWith("http") &&
                <div className="mb-3">
                  <label htmlFor="inputServer" className="visually-hidden">
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
              {register ? <div className="mb-3">
                <label htmlFor="inputInvitationCode" className="visually-hidden">
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
                      <Nav.Link eventKey="gams_engine" title="Standard">Standard</Nav.Link>
                    </Nav.Item>
                    {ldapConfig.map(config =>
                      <Nav.Item key={config.name}>
                        <Nav.Link eventKey={config.name} title={config.label}>{config.label}</Nav.Link>
                      </Nav.Item>
                    )}
                  </Nav> : <></>)}
              {(!register || isValidInvitationCode) && <div className="mb-3">
                <label htmlFor="username" className="visually-hidden">
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
              {(!register || (isValidInvitationCode && invitationCodeIdentityProvider === "gams_engine")) &&
                <ShowHidePasswordInput
                  value={password}
                  setValue={setPassword}
                  id="inputPassword"
                  label="Password"
                  invalidFeedback={passwordError}
                  autoComplete="current-password"
                  usePlaceholder={true}
                  required={true} />}
              {register && isValidInvitationCode && invitationCodeIdentityProvider === "gams_engine" &&
                <ShowHidePasswordInput
                  value={confirmPassword}
                  setValue={setConfirmPassword}
                  id="confirmPassword"
                  label="Confirm Password"
                  invalidFeedback={confirmPasswordError}
                  usePlaceholder={true}
                  required={true} />}
            </fieldset>
            <div className="d-grid gap-2">
              <SubmitButton isSubmitting={isSubmitting} isDisabled={register && !isValidInvitationCode}>
                {register ? "Register" : "Login"}
              </SubmitButton>
              {register ? <></> : OAuthConfig.map((config, idx) => {
                return <button type="button" disabled={isSubmitting} className='btn btn-sm btn-secondary'
                  onClick={() => setOAuthLoginConfig(config)}>
                  {config.label}
                </button>
              })}
            </div>
            <div className="mt-2">
              <small>
                <Link to={register ? "/login" : "/register"} onClick={() => {
                  clearRegisterErrors();
                  setRegister(current => !current);
                }}>{register ? "Login" : "Register"}</Link>
              </small>
            </div>
          </>
        }
        {login ? <Navigate replace to="/" /> : ""}
      </form>
      <OAuth2Login
        server={server}
        loginConfig={OAuthLoginConfig}
        setAuthToken={setOAuthToken}
        setErrorMsg={setOAuthErrorMsg} />
    </div>
  );
};

export default LoginForm;
