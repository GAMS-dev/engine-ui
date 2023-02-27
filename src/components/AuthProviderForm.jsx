import React, { useEffect, useContext, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Select from 'react-select';
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Trash2 } from "react-feather";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import RemoveAuthProviderModal from "./RemoveAuthProviderModal";
import { getResponseError } from "./util";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import SubmitButton from "./SubmitButton";
import ShowHidePasswordInput from "./ShowHidePasswordInput";

const availableProviderTypes = [{ value: 'oidc', label: 'OpenID Connect' },
{ value: 'ldap', label: 'LDAP' },
{ value: 'oauth2', label: 'OAuth 2.0' }];
const autoDiscoveryModes = [{ value: 'manual', label: 'Enter information manually' },
{ value: 'oauth2', label: 'OAuth 2.0 Authorization Server Metadata' },
{ value: 'oidc', label: 'OpenID Connect Discovery 1.0' }];
const ldapAvailableEncryptionMethods = [{ value: 'start_tls', label: 'StartTLS' }, { value: 'simple_tls', label: 'Simple TLS' },
{ value: 'plain', label: 'Plain (no encryption)' }];

const AuthProviderForm = () => {
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const navigate = useNavigate();

    const updateHostnameButton = useRef(null);

    const [refreshProviders, setRefreshProviders] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState("");

    const [selectedAuthProvider, setSelectedAuthProvider] = useState("__+add_new");
    const [authProviders, setAuthProviders] = useState([]);
    const [ldapProviders, setLdapProviders] = useState([]);
    const [OAuthProviders, setOAuthProviders] = useState([]);
    const [currentConfigHostname, setCurrentConfigHostname] = useState("http://localhost/api");
    const [expectedConfigHostname, setExpectedConfigHostname] = useState(server);
    const [hostnameUpdating, setHostnameUpdating] = useState(false);

    const [providerName, setProviderName] = useState("");
    const [providerLabel, setProviderLabel] = useState("");
    const [providerHidden, setProviderHidden] = useState(false);
    const [providerType, setProviderType] = useState("oidc");

    const [issuerID, setIssuerID] = useState("");
    const [oauthAudience, setOauthAudience] = useState("");
    const [issuerIDModified, setIssuerIDModified] = useState(false);
    const [issuerValid, setIssuerValid] = useState(true);
    const [webuiClientId, setWebuiClientId] = useState("");
    const [webuiClientSecret, setWebuiClientSecret] = useState("");
    const [deviceClientId, setDeviceClientId] = useState("");
    const [deviceClientSecret, setDeviceClientSecret] = useState("");
    const [autoDiscoveryMode, setAutoDiscoveryMode] = useState(autoDiscoveryModes[0]);
    const [authorizationEndpoint, setAuthorizationEndpoint] = useState("");
    const [tokenEndpoint, setTokenEndpoint] = useState("");
    const [endSessionEndpoint, setEndSessionEndpoint] = useState("");
    const [deviceAuthorizationEndpoint, setDeviceAuthorizationEndpoint] = useState("");
    const [jwksUri, setJwksUri] = useState("");
    const [responseTypesSupported, setResponseTypesSupported] = useState("");
    const [grantTypesSupported, setGrantTypesSupported] = useState("");
    const [requestScopeREADONLY, setRequestScopeREADONLY] = useState("READONLY");
    const [requestScopeCONFIGURATION, setRequestScopeCONFIGURATION] = useState("CONFIGURATION");
    const [requestScopeNAMESPACES, setRequestScopeNAMESPACES] = useState("NAMESPACES");
    const [requestScopeJOBS, setRequestScopeJOBS] = useState("JOBS");
    const [requestScopeUSERS, setRequestScopeUSERS] = useState("USERS");
    const [requestScopeHYPERCUBE, setRequestScopeHYPERCUBE] = useState("HYPERCUBE");
    const [requestScopeCLEANUP, setRequestScopeCLEANUP] = useState("CLEANUP");
    const [requestScopeLICENSES, setRequestScopeLICENSES] = useState("LICENSES");
    const [requestScopeUSAGE, setRequestScopeUSAGE] = useState("USAGE");
    const [requestScopeAUTH, setRequestScopeAUTH] = useState("AUTH");
    const [extraClientIds, setExtraClietIds] = useState("");
    const [oidcScopes, setOidcScopes] = useState("openid,profile,email");

    const [ldapHost, setLdapHost] = useState("");
    const [ldapPort, setLdapPort] = useState(389);
    const [ldapUid, setLdapUid] = useState("");
    const [ldapBindDN, setLdapBindDN] = useState("");
    const [ldapPassword, setLdapPassword] = useState("");
    const [ldapEncryptionMethod, setLdapEncryptionMethod] = useState("start_tls");
    const [ldapVerifyCertificates, setLdapVerifyCertificates] = useState(true);
    const [ldapActiveDirectory, setLdapActiveDirectory] = useState(false);
    const [ldapBase, setLdapBase] = useState("");
    const [ldapUserFilter, setLdapUserFilter] = useState("");

    const [showRemoveAuthProviderModal, setShowRemoveAuthProviderModal] = useState(false);
    const [showUpdateHostnameModal, setShowUpdateHostnameModal] = useState(false);

    useEffect(() => {
        const fetchAuthProviders = async () => {
            try {
                setShowRemoveAuthProviderModal(false);
                setSelectedAuthProvider('__+add_new');
                setIsLoading(true);
                const responseLdapPromise = axios.get(`${server}/auth/ldap-providers`);
                const responseOauthPromise = axios.get(`${server}/auth/oauth2-providers`);
                const responseOidcPromise = axios.get(`${server}/auth/oidc-providers`);
                const responseConfigPromise = axios.get(`${server}/configuration`);
                const response = await axios.get(`${server}/auth/providers/all`);
                const responseLdap = await responseLdapPromise;
                const responseOidc = await responseOidcPromise;
                const responseOAuth = await responseOauthPromise;
                const responseConfig = await responseConfigPromise;
                try {
                    setExpectedConfigHostname(new URL(server).href);
                } catch (_) {
                    setExpectedConfigHostname(new URL(server, document.baseURI).href);
                }
                setCurrentConfigHostname(responseConfig.data.hostname);
                setAuthProviders(response.data.filter(config => config.is_main_identity_provider !== true));
                setOAuthProviders(responseOAuth.data.concat(responseOidc.data));
                setLdapProviders(responseLdap.data);
                setIsLoading(false);
            } catch (err) {
                setAlertMsg(`Problems retrieving authentication providers. Error message: ${getResponseError(err)}.`);
            }
        }
        fetchAuthProviders();
    }, [jwt, server, roles, username, setAlertMsg, refreshProviders]);

    useEffect(() => {
        const validateIssuerId = (issuerIDToAssert) => {
            if (issuerIDModified === false) {
                return true;
            }
            let issuerURL;
            try {
                issuerURL = new URL(issuerIDToAssert);
            } catch (_) {
                return false;
            }
            if (issuerURL.protocol !== "https:") {
                setFormErrors(formErrors => {
                    formErrors.issuer = "Only HTTPS allowed";
                    return formErrors;
                });
                return false;
            }
            if (issuerURL.search !== "" || issuerURL.hash !== "") {
                setFormErrors(formErrors => {
                    formErrors.issuer = "Issuer URL must not contain query string or fragment components";
                    return formErrors;
                });
                return false;
            }
            axios.get(`${issuerURL.href}/.well-known/openid-configuration`)
                .then(_ => {
                    setAutoDiscoveryMode(autoDiscoveryModes.filter(mode => mode.value === 'oidc')[0]);
                })
                .catch(_ => {
                    axios.get(`${issuerURL.href}/.well-known/oauth-authorization-server`)
                        .then(_ => {
                            setAutoDiscoveryMode(autoDiscoveryModes.filter(mode => mode.value === 'oauth2')[0]);
                        })
                        .catch(_ => {
                            setAutoDiscoveryMode(autoDiscoveryModes.filter(mode => mode.value === 'manual')[0]);
                        });
                });
            return true;
        }
        const updateIssuerID = setTimeout(() => {
            setIssuerValid(validateIssuerId(issuerID))
        }, 1000);
        return () => clearTimeout(updateIssuerID)
    }, [issuerID, issuerIDModified])

    useEffect(() => {
        setIssuerIDModified(false);
        setFormErrors("");
        if (selectedAuthProvider === '__+add_new') {
            setProviderName('');
            setProviderLabel('');
            setProviderHidden(false);
            setProviderType(availableProviderTypes[0].value);
            setAutoDiscoveryMode(autoDiscoveryModes[0]);
            setIssuerID('');
            setWebuiClientId('');
            setWebuiClientSecret('');
            setDeviceClientId('');
            setDeviceClientSecret('');
            setAuthorizationEndpoint('');
            setTokenEndpoint('');
            setEndSessionEndpoint('');
            setDeviceAuthorizationEndpoint('');
            setJwksUri('');
            setOauthAudience(currentConfigHostname);
            setResponseTypesSupported('');
            setGrantTypesSupported('');
            setRequestScopeREADONLY('READONLY');
            setRequestScopeCONFIGURATION('CONFIGURATION');
            setRequestScopeNAMESPACES('NAMESPACES');
            setRequestScopeJOBS('JOBS');
            setRequestScopeUSERS('USERS');
            setRequestScopeHYPERCUBE('HYPERCUBE');
            setRequestScopeCLEANUP('CLEANUP');
            setRequestScopeLICENSES('LICENSES');
            setRequestScopeUSAGE('USAGE');
            setRequestScopeAUTH('AUTH');
            setLdapHost('');
            setLdapPort(389);
            setLdapUid('');
            setLdapBindDN('');
            setLdapPassword('');
            setLdapEncryptionMethod('start_tls');
            setLdapVerifyCertificates(true);
            setLdapActiveDirectory(false);
            setLdapBase('');
            setLdapUserFilter('');
            setExtraClietIds('');
            setOidcScopes('openid,profile,email');
        } else {
            const providerConfig = authProviders.filter(config => config.name === selectedAuthProvider);
            if (providerConfig.length !== 1) {
                setAlertMsg('Invalid provider selected.');
                return;
            }
            setProviderName(providerConfig[0].name);
            setProviderLabel(providerConfig[0].label);
            setProviderHidden(providerConfig[0].hidden === true);
            if (providerConfig[0].oauth2 != null || providerConfig[0].oidc != null) {
                if (providerConfig[0].oauth2 != null) {
                    setProviderType('oauth2');
                } else {
                    setProviderType('oidc');
                }
                const oAuthProviderConfig = OAuthProviders.filter(config => config.name === providerConfig[0].name)[0];
                setAutoDiscoveryMode(autoDiscoveryModes[0]);
                setIssuerID(oAuthProviderConfig.issuer);
                setWebuiClientId(oAuthProviderConfig.web_ui_client_id);
                setWebuiClientSecret(oAuthProviderConfig.web_ui_client_secret == null ? '' : oAuthProviderConfig.web_ui_client_secret);
                setDeviceClientId(oAuthProviderConfig.device_client_id == null ? '' : oAuthProviderConfig.device_client_id);
                setDeviceClientSecret(oAuthProviderConfig.device_client_secret == null ? '' : oAuthProviderConfig.device_client_secret);
                setOauthAudience(oAuthProviderConfig.override_audience ? oAuthProviderConfig.override_audience : currentConfigHostname);
                setAuthorizationEndpoint(oAuthProviderConfig.authorization_endpoint);
                setTokenEndpoint(oAuthProviderConfig.token_endpoint);
                setEndSessionEndpoint(oAuthProviderConfig.end_session_endpoint == null ? '' : oAuthProviderConfig.end_session_endpoint);
                setDeviceAuthorizationEndpoint(oAuthProviderConfig.device_authorization_endpoint == null ? '' : oAuthProviderConfig.device_authorization_endpoint);
                setJwksUri(oAuthProviderConfig.jwks_uri);
                if (providerConfig[0].oidc != null) {
                    setExtraClietIds(oAuthProviderConfig.extra_client_ids == null ? '' : oAuthProviderConfig.extra_client_ids.join(","));
                    setOidcScopes(oAuthProviderConfig.scopes.join(","));
                } else {
                    setExtraClietIds('');
                    setOidcScopes('');
                    setResponseTypesSupported(oAuthProviderConfig.response_types_supported.join(","));
                    setGrantTypesSupported(oAuthProviderConfig.grant_types_supported.join(","));
                    setRequestScopeREADONLY(oAuthProviderConfig.scopes.filter(scope => scope.scope === "READONLY")[0].request_scope);
                    setRequestScopeCONFIGURATION(oAuthProviderConfig.scopes.filter(scope => scope.scope === "CONFIGURATION")[0].request_scope);
                    setRequestScopeNAMESPACES(oAuthProviderConfig.scopes.filter(scope => scope.scope === "NAMESPACES")[0].request_scope);
                    setRequestScopeJOBS(oAuthProviderConfig.scopes.filter(scope => scope.scope === "JOBS")[0].request_scope);
                    setRequestScopeUSERS(oAuthProviderConfig.scopes.filter(scope => scope.scope === "USERS")[0].request_scope);
                    setRequestScopeHYPERCUBE(oAuthProviderConfig.scopes.filter(scope => scope.scope === "HYPERCUBE")[0].request_scope);
                    setRequestScopeCLEANUP(oAuthProviderConfig.scopes.filter(scope => scope.scope === "CLEANUP")[0].request_scope);
                    setRequestScopeLICENSES(oAuthProviderConfig.scopes.filter(scope => scope.scope === "LICENSES")[0].request_scope);
                    setRequestScopeUSAGE(oAuthProviderConfig.scopes.filter(scope => scope.scope === "USAGE")[0].request_scope);
                    setRequestScopeAUTH(oAuthProviderConfig.scopes.filter(scope => scope.scope === "AUTH")[0].request_scope);
                }
            } else if (providerConfig[0].is_ldap_identity_provider === true) {
                setProviderType('ldap');
                const ldapProviderConfig = ldapProviders.filter(config => config.name === providerConfig[0].name)[0];
                setLdapHost(ldapProviderConfig.host);
                setLdapPort(ldapProviderConfig.port);
                setLdapUid(ldapProviderConfig.uid);
                setLdapBindDN(ldapProviderConfig.bind_dn == null ? '' : ldapProviderConfig.bind_dn);
                setLdapPassword(ldapProviderConfig.password == null ? '' : ldapProviderConfig.password);
                setLdapEncryptionMethod(ldapProviderConfig.encryption);
                setLdapVerifyCertificates(ldapProviderConfig.verify_certificates !== false);
                setLdapActiveDirectory(ldapProviderConfig.active_directory === true);
                setLdapBase(ldapProviderConfig.base);
                setLdapUserFilter(ldapProviderConfig.user_filter);
            } else {
                setAlertMsg('Unknown identity provider type')
            }
        }
    }, [selectedAuthProvider, authProviders, ldapProviders, OAuthProviders, setAlertMsg, server, currentConfigHostname]);

    const updateHostname = async (acceptLogout) => {
        if (acceptLogout === false) {
            setShowUpdateHostnameModal(true);
            return;
        }
        try {
            setHostnameUpdating(true);
            const patchConfigForm = new FormData();
            patchConfigForm.append("hostname", expectedConfigHostname);
            await axios.patch(`${server}/configuration`, patchConfigForm);
            setCurrentConfigHostname(expectedConfigHostname);
        } catch (err) {
            setAlertMsg(`Problems updating hostname. Error message: ${getResponseError(err)}.`);
        } finally {
            setHostnameUpdating(false);
            navigate("/logout");
        }
    }

    const handleAuthProviderSubmission = async () => {
        if (issuerValid !== true) {
            return;
        }
        setIsSubmitting(true);
        setFormErrors("");
        setSubmissionErrorMsg("");
        let authURI;
        const authProviderForm = new FormData();
        authProviderForm.append("name", providerName);
        authProviderForm.append("label", providerLabel);
        authProviderForm.append("hidden", providerHidden);
        if (['oidc', 'oauth2'].includes(providerType)) {
            authProviderForm.append("web_ui_client_id", webuiClientId);
            if (webuiClientSecret !== "") {
                authProviderForm.append("web_ui_client_secret", webuiClientSecret);
            }
            if (deviceClientId !== "") {
                authProviderForm.append("device_client_id", deviceClientId);
            }
            if (deviceClientSecret !== "") {
                authProviderForm.append("device_client_secret", deviceClientSecret);
            }
            authProviderForm.append("issuer", issuerID);
            if (autoDiscoveryMode.value === 'oidc') {
                authProviderForm.append("use_oidc_discover", true);
                if (providerType === 'oauth2') {
                    authProviderForm.append("use_oauth2_auth_server_metadata", false);
                }
            } else if (autoDiscoveryMode.value === 'oauth2') {
                authProviderForm.append("use_oidc_discover", false);
                authProviderForm.append("use_oauth2_auth_server_metadata", true);
            } else {
                authProviderForm.append("use_oidc_discover", false);
                if (providerType === 'oauth2') {
                    authProviderForm.append("use_oauth2_auth_server_metadata", true);
                }
                authProviderForm.append("authorization_endpoint", authorizationEndpoint);
                authProviderForm.append("token_endpoint", tokenEndpoint);
                authProviderForm.append("jwks_uri", jwksUri);
                if (endSessionEndpoint !== "") {
                    authProviderForm.append("end_session_endpoint", endSessionEndpoint);
                }
                if (deviceAuthorizationEndpoint !== "") {
                    authProviderForm.append("device_authorization_endpoint", deviceAuthorizationEndpoint);
                }
            }
            if (providerType === 'oauth2') {
                authURI = `${server}/auth/oauth2-providers`;
                authProviderForm.append("request_scope_READONLY", requestScopeREADONLY);
                authProviderForm.append("request_scope_CONFIGURATION", requestScopeCONFIGURATION);
                authProviderForm.append("request_scope_NAMESPACES", requestScopeNAMESPACES);
                authProviderForm.append("request_scope_JOBS", requestScopeJOBS);
                authProviderForm.append("request_scope_USERS", requestScopeUSERS);
                authProviderForm.append("request_scope_HYPERCUBE", requestScopeHYPERCUBE);
                authProviderForm.append("request_scope_CLEANUP", requestScopeCLEANUP);
                authProviderForm.append("request_scope_LICENSES", requestScopeLICENSES);
                authProviderForm.append("request_scope_USAGE", requestScopeUSAGE);
                authProviderForm.append("request_scope_AUTH", requestScopeAUTH);
                if (oauthAudience !== currentConfigHostname) {
                    authProviderForm.append("override_audience", oauthAudience);
                }
                if (autoDiscoveryMode.value === 'manual') {
                    responseTypesSupported.split(",").forEach(responseTypeSupported => {
                        authProviderForm.append("response_types_supported", responseTypeSupported);
                    });
                    grantTypesSupported.split(",").forEach(grantTypeSupported => {
                        authProviderForm.append("grant_types_supported", grantTypeSupported);
                    });
                }
            } else {
                authURI = `${server}/auth/oidc-providers`;
                extraClientIds.split(",").forEach(extraClientId => {
                    if (extraClientId !== '') {
                        authProviderForm.append("extra_client_ids", extraClientId.trim());
                    }
                });
                oidcScopes.split(",").forEach(oidcScope => {
                    if (oidcScope !== '') {
                        authProviderForm.append("scopes", oidcScope.trim());
                    }
                });
            }
        } else if (providerType === "ldap") {
            authURI = `${server}/auth/ldap-providers`;

            authProviderForm.append("host", ldapHost);
            authProviderForm.append("port", ldapPort);
            authProviderForm.append("uid", ldapUid);
            if (ldapBindDN !== "") {
                authProviderForm.append("bind_dn", ldapBindDN);
                authProviderForm.append("password", ldapPassword);
            }
            authProviderForm.append("encryption", ldapEncryptionMethod);
            authProviderForm.append("verify_certificates", ldapVerifyCertificates);
            authProviderForm.append("active_directory", ldapActiveDirectory);
            authProviderForm.append("base", ldapBase);
            authProviderForm.append("user_filter", ldapUserFilter);
        } else {
            setAlertMsg("Invalid auth provider type!");
            return
        }
        try {
            if (selectedAuthProvider === '__+add_new') {
                await axios.post(authURI, authProviderForm);
            } else {
                await axios.put(authURI, authProviderForm);
            }
            setAlertMsg(`success:Authentication provider ${selectedAuthProvider === '__+add_new' ? 'added' : 'updated'} successfully!`);
            setRefreshProviders(curr => curr + 1);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                setFormErrors(err.response.data.errors);
                setSubmissionErrorMsg('Problems updating authentication providers.');
            } else {
                setSubmissionErrorMsg(`Problems updating authentication providers. Error message: ${getResponseError(err)}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (<>
        {isLoading ? <ClipLoader /> : <div className="row">
            <div className="col-md-4 col-12 mt-1 font-weight-bold">
            </div>
            <div className="col-md-8 col-12 mt-1 order-2 order-md-1">
                <div className="btn-toolbar mb-2 mb-md-0 float-right">
                </div>
            </div>
            <div className="namespace-list col-md-4 col-12 order-1 order-md-2 mt-1">
                <ul className="list-group" id="list-tab" role="tablist">
                    <li
                        key='__+add_new'
                        onClick={() => setSelectedAuthProvider('__+add_new')}
                        className={`list-group-item list-group-item-add list-group-item-action${selectedAuthProvider === '__+add_new' ? " active" : ""}`}
                    >
                        Add New Provider
                    </li>
                    {authProviders.map(authProvider => (
                        <li
                            key={authProvider.name}
                            onClick={() => setSelectedAuthProvider(authProvider.name)}
                            className={`list-group-item list-group-item-action${authProvider.name === selectedAuthProvider ? " active" : ""}`}
                        >
                            {authProvider.name}
                            <span className="float-right">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => {
                                        setShowRemoveAuthProviderModal(true);
                                    }}
                                >
                                    <Trash2 width="14px" />
                                </button>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="col-md-8 col-12 order-4 mt-1">
                <form
                    className="m-auto"
                    onSubmit={e => {
                        e.preventDefault();
                        handleAuthProviderSubmission();
                        return false;
                    }}
                >
                    <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    <fieldset disabled={isSubmitting}>
                        <div className="form-group mt-3 mb-3">
                            <label htmlFor="providerName">
                                Unique identifier of the provider
                            </label>
                            <input
                                type="text"
                                className={"form-control" + (formErrors.name ? " is-invalid" : "")}
                                id="providerName"
                                disabled={selectedAuthProvider !== '__+add_new'}
                                autoComplete="on"
                                required
                                value={providerName}
                                onChange={e => setProviderName(e.target.value)}
                            />
                            <div className="invalid-feedback">
                                {formErrors.name ? formErrors.name : ""}
                            </div>
                        </div>
                        <div className="form-group mt-3 mb-3">
                            <label htmlFor="providerType">
                                Provider type
                            </label>
                            <Select
                                id="providerType"
                                isClearable={false}
                                value={availableProviderTypes.filter(type => type.value === providerType)[0]}
                                isSearchable={true}
                                isDisabled={selectedAuthProvider !== '__+add_new'}
                                onChange={selected => setProviderType(selected.value)}
                                options={availableProviderTypes}
                            />
                        </div>
                        <div className="form-group mt-3 mb-3">
                            <label htmlFor="providerLabel">
                                {`Label (used for login ${['oidc', 'oauth2'].includes(providerType) ? 'button' : 'tab name'} in Engine UI)`}
                            </label>
                            <input
                                type="text"
                                className={"form-control" + (formErrors.label ? " is-invalid" : "")}
                                id="providerLabel"
                                autoComplete="on"
                                required
                                value={providerLabel}
                                onChange={e => setProviderLabel(e.target.value)}
                            />
                            <div className="invalid-feedback">
                                {formErrors.label ? formErrors.label : ""}
                            </div>
                        </div>
                        <div className="form-check mt-3">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={providerHidden}
                                onChange={e => setProviderHidden(e.target.checked)}
                                id="providerHidden"
                                aria-describedby="providerHiddenHelp"
                            />
                            <label className="form-check-label" htmlFor="providerHidden">Hide identity provider on login page?</label>
                            <small id="providerHiddenHelp" className="form-text text-muted">
                                Will be accessible on <code>/login</code> page via <code>provider</code> parameter (e.g. <code>/login?provider=provider1</code> for identity provider with name: <code>provider1</code>).
                            </small>
                        </div>
                        {['oidc', 'oauth2'].includes(providerType) ?
                            <>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="issuerID">
                                        URL that the {providerType === 'oauth2' ? 'OAuth 2.0' : 'OpenID Connect'} provider asserts as its Issuer Identifier
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (issuerValid && (formErrors.issuer === "" || formErrors.issuer == null) ? "" : " is-invalid")}
                                        id="issuerID"
                                        aria-describedby="issuerHelp"
                                        autoComplete="on"
                                        value={issuerID}
                                        required
                                        onChange={e => {
                                            setIssuerIDModified(true)
                                            setIssuerID(e.target.value)
                                        }}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.issuer ? formErrors.issuer : ""}
                                    </div>
                                    <small id="issuerHelp" className="form-text text-muted">
                                        Using the <i>HTTPS</i> scheme with no query or fragment component
                                    </small>
                                </div>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="webuiClientId">
                                        Client ID to be used by the Engine UI
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.web_ui_client_id ? " is-invalid" : "")}
                                        id="webuiClientId"
                                        autoComplete="on"
                                        required
                                        value={webuiClientId}
                                        onChange={e => setWebuiClientId(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.web_ui_client_id ? formErrors.web_ui_client_id : ""}
                                    </div>
                                </div>
                                <ShowHidePasswordInput
                                    value={webuiClientSecret}
                                    setValue={setWebuiClientSecret}
                                    id="webuiClientSecret"
                                    label="Client secret (not recommended, leave empty and use public client if possible)"
                                    invalidFeedback={formErrors.web_ui_client_secret}
                                    helpText="If your identity provider does not support registering public clients without a secret, the Engine API is used as a proxy when retrieving the authorization token."
                                    additionalClassesContainer="mt-3 mb-3" />
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="deviceClientId">
                                        Client ID to be used by clients that do not have browser access (optional)
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.device_client_id ? " is-invalid" : "")}
                                        id="deviceClientId"
                                        autoComplete="on"
                                        aria-describedby="deviceClientIdHelp"
                                        value={deviceClientId}
                                        onChange={e => setDeviceClientId(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.device_client_id ? formErrors.device_client_id : ""}
                                    </div>
                                    <small id="deviceClientIdHelp" className="form-text text-muted">
                                        The client must be a public client. Your identity provider must support the <kbd>urn:ietf:params:oauth:grant-type:device_code</kbd> grant type and the device authorization endpoint must be provided.
                                    </small>
                                </div>
                                <ShowHidePasswordInput
                                    value={deviceClientSecret}
                                    setValue={setDeviceClientSecret}
                                    id="deviceClientSecret"
                                    label="Device client secret (not recommended, leave empty and use public client if possible)"
                                    invalidFeedback={formErrors.device_client_secret}
                                    helpText="If your identity provider does not support registering public clients without a secret, the Engine API is used as a proxy when retrieving the authorization token."
                                    additionalClassesContainer="mt-3 mb-3" />
                                {providerType === 'oauth2' ?
                                    <>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="oauthAudience">
                                                Audience of the JWT tokens
                                            </label>
                                            {currentConfigHostname !== expectedConfigHostname ?
                                                <div>
                                                    {hostnameUpdating ? <ClipLoader /> : <small>
                                                        The Engine configuration does not seem to be set to the correct hostname (current: {currentConfigHostname}, expected: {expectedConfigHostname}). Do you want to update the hostname now?
                                                        <Button className="btn-update-hostname" variant="link" ref={updateHostnameButton} onClick={() => updateHostname(false)}>Update</Button>
                                                    </small>}
                                                </div> : <></>}
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.override_audience ? " is-invalid" : "")}
                                                id="oauthAudience"
                                                autoComplete="on"
                                                aria-describedby="oauthAudienceHelp"
                                                value={oauthAudience}
                                                required
                                                onChange={e => setOauthAudience(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.override_audience ? formErrors.override_audience : ""}
                                            </div>
                                            <small id="oauthAudienceHelp" className="form-text text-muted">
                                                <b>Please do not change the audience unless your identity provider does not allow you to set the audience correctly!</b>
                                            </small>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeREADONLY">
                                                Scope that the client should request from the OP to get 'READONLY' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_READONLY ? " is-invalid" : "")}
                                                id="requestScopeREADONLY"
                                                autoComplete="on"
                                                required
                                                value={requestScopeREADONLY}
                                                onChange={e => setRequestScopeREADONLY(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_READONLY ? formErrors.request_scope_READONLY : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeCONFIGURATION">
                                                Scope that the client should request from the OP to get 'CONFIGURATION' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_CONFIGURATION ? " is-invalid" : "")}
                                                id="requestScopeCONFIGURATION"
                                                autoComplete="on"
                                                required
                                                value={requestScopeCONFIGURATION}
                                                onChange={e => setRequestScopeCONFIGURATION(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_CONFIGURATION ? formErrors.request_scope_CONFIGURATION : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeNAMESPACES">
                                                Scope that the client should request from the OP to get 'NAMESPACES' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_NAMESPACES ? " is-invalid" : "")}
                                                id="requestScopeNAMESPACES"
                                                autoComplete="on"
                                                required
                                                value={requestScopeNAMESPACES}
                                                onChange={e => setRequestScopeNAMESPACES(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_NAMESPACES ? formErrors.request_scope_NAMESPACES : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeJOBS">
                                                Scope that the client should request from the OP to get 'JOBS' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_JOBS ? " is-invalid" : "")}
                                                id="requestScopeJOBS"
                                                autoComplete="on"
                                                required
                                                value={requestScopeJOBS}
                                                onChange={e => setRequestScopeJOBS(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_JOBS ? formErrors.request_scope_JOBS : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeUSERS">
                                                Scope that the client should request from the OP to get 'USERS' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_USERS ? " is-invalid" : "")}
                                                id="requestScopeUSERS"
                                                autoComplete="on"
                                                required
                                                value={requestScopeUSERS}
                                                onChange={e => setRequestScopeUSERS(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_USERS ? formErrors.request_scope_USERS : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeHYPERCUBE">
                                                Scope that the client should request from the OP to get 'HYPERCUBE' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_HYPERCUBE ? " is-invalid" : "")}
                                                id="requestScopeHYPERCUBE"
                                                autoComplete="on"
                                                required
                                                value={requestScopeHYPERCUBE}
                                                onChange={e => setRequestScopeHYPERCUBE(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_HYPERCUBE ? formErrors.request_scope_HYPERCUBE : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeCLEANUP">
                                                Scope that the client should request from the OP to get 'CLEANUP' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_CLEANUP ? " is-invalid" : "")}
                                                id="requestScopeCLEANUP"
                                                autoComplete="on"
                                                required
                                                value={requestScopeCLEANUP}
                                                onChange={e => setRequestScopeCLEANUP(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_CLEANUP ? formErrors.request_scope_CLEANUP : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeLICENSES">
                                                Scope that the client should request from the OP to get 'LICENSES' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_LICENSES ? " is-invalid" : "")}
                                                id="requestScopeLICENSES"
                                                autoComplete="on"
                                                required
                                                value={requestScopeLICENSES}
                                                onChange={e => setRequestScopeLICENSES(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_LICENSES ? formErrors.request_scope_LICENSES : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeUSAGE">
                                                Scope that the client should request from the OP to get 'USAGE' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_USAGE ? " is-invalid" : "")}
                                                id="requestScopeUSAGE"
                                                autoComplete="on"
                                                required
                                                value={requestScopeUSAGE}
                                                onChange={e => setRequestScopeUSAGE(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_USAGE ? formErrors.request_scope_USAGE : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="requestScopeAUTH">
                                                Scope that the client should request from the OP to get 'AUTH' scope
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.request_scope_AUTH ? " is-invalid" : "")}
                                                id="requestScopeAUTH"
                                                autoComplete="on"
                                                required
                                                value={requestScopeAUTH}
                                                onChange={e => setRequestScopeAUTH(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.request_scope_AUTH ? formErrors.request_scope_AUTH : ""}
                                            </div>
                                        </div>
                                    </> : <>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="oidcScopes">
                                                The scopes to request from the OP (optional, comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.scopes ? " is-invalid" : "")}
                                                id="oidcScopes"
                                                autoComplete="on"
                                                value={oidcScopes}
                                                onChange={e => setOidcScopes(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.scopes ? formErrors.scopes : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="extraClientIDs">
                                                Additional client IDs from which the API accepts ID tokens (optional, comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.extra_client_ids ? " is-invalid" : "")}
                                                id="extraClientIDs"
                                                autoComplete="on"
                                                value={extraClientIds}
                                                onChange={e => setExtraClietIds(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.extra_client_ids ? formErrors.extra_client_ids : ""}
                                            </div>
                                        </div>
                                    </>}
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="autoDiscoveryMode">
                                        Auto discovery endpoint
                                    </label>
                                    <Select
                                        id="autoDiscoveryMode"
                                        isClearable={false}
                                        value={autoDiscoveryMode}
                                        isSearchable={true}
                                        onChange={selected => setAutoDiscoveryMode(selected)}
                                        options={autoDiscoveryModes}
                                    />
                                </div>
                                {autoDiscoveryMode.value === 'manual' ? <>
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="authorizationEndpoint">
                                            URL of the authorization endpoint
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.authorization_endpoint ? " is-invalid" : "")}
                                            id="authorizationEndpoint"
                                            autoComplete="on"
                                            required
                                            value={authorizationEndpoint}
                                            onChange={e => setAuthorizationEndpoint(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.authorization_endpoint ? formErrors.authorization_endpoint : ""}
                                        </div>
                                    </div>
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="tokenEndpoint">
                                            URL of the token endpoint
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.token_endpoint ? " is-invalid" : "")}
                                            id="tokenEndpoint"
                                            autoComplete="on"
                                            required
                                            value={tokenEndpoint}
                                            onChange={e => setTokenEndpoint(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.token_endpoint ? formErrors.token_endpoint : ""}
                                        </div>
                                    </div>
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="deviceAuthorizationEndpoint">
                                            URL of the device authorization endpoint
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.device_authorization_endpoint ? " is-invalid" : "")}
                                            id="deviceAuthorizationEndpoint"
                                            autoComplete="on"
                                            value={deviceAuthorizationEndpoint}
                                            onChange={e => setDeviceAuthorizationEndpoint(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.device_authorization_endpoint ? formErrors.device_authorization_endpoint : ""}
                                        </div>
                                    </div>
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="jwksUri">
                                            URL of the JSON Web Key Set document
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.jwks_uri ? " is-invalid" : "")}
                                            id="jwksUri"
                                            autoComplete="on"
                                            value={jwksUri}
                                            required
                                            onChange={e => setJwksUri(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.jwks_uri ? formErrors.jwks_uri : ""}
                                        </div>
                                    </div>
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="endSessionEndpoint">
                                            URL of the end session endpoint (optional)
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.end_session_endpoint ? " is-invalid" : "")}
                                            id="endSessionEndpoint"
                                            autoComplete="on"
                                            value={endSessionEndpoint}
                                            onChange={e => setEndSessionEndpoint(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.end_session_endpoint ? formErrors.end_session_endpoint : ""}
                                        </div>
                                    </div>
                                </> : <></>}
                                {autoDiscoveryMode.value === 'manual' && providerType === 'oauth2' ?
                                    <>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="responseTypesSupported">
                                                List of response types that the provider supports (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.response_types_supported ? " is-invalid" : "")}
                                                id="responseTypesSupported"
                                                autoComplete="on"
                                                required
                                                value={responseTypesSupported}
                                                onChange={e => setResponseTypesSupported(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.response_types_supported ? formErrors.response_types_supported : ""}
                                            </div>
                                        </div>
                                        <div className="form-group mt-3 mb-3">
                                            <label htmlFor="grantTypesSupported">
                                                List of grant types that the provider supports (comma-separated)
                                            </label>
                                            <input
                                                type="text"
                                                className={"form-control" + (formErrors.grant_types_supported ? " is-invalid" : "")}
                                                id="grantTypesSupported"
                                                autoComplete="on"
                                                value={grantTypesSupported}
                                                onChange={e => setGrantTypesSupported(e.target.value)}
                                            />
                                            <div className="invalid-feedback">
                                                {formErrors.grant_types_supported ? formErrors.grant_types_supported : ""}
                                            </div>
                                        </div>
                                    </> : <></>}
                            </> : <>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapHost">
                                        Host of the LDAP server
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.host ? " is-invalid" : "")}
                                        id="ldapHost"
                                        aria-describedby="ldapHostHelp"
                                        autoComplete="on"
                                        value={ldapHost}
                                        required
                                        onChange={e => setLdapHost(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.host ? formErrors.host : ""}
                                    </div>
                                    <small id="ldapHostHelp" className="form-text text-muted">
                                        Excluding protocol and port
                                    </small>
                                </div>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapPort">
                                        Port of the LDAP server
                                    </label>
                                    <input
                                        type="number"
                                        className={"form-control" + (formErrors.port ? " is-invalid" : "")}
                                        id="ldapPort"
                                        aria-describedby="ldapPortHelp"
                                        min="1"
                                        max="65535"
                                        value={ldapPort}
                                        required
                                        onChange={e => setLdapPort(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.port ? formErrors.port : ""}
                                    </div>
                                    <small id="ldapPortHelp" className="form-text text-muted">
                                        Examples: 389 (Plain or StartTLS) and 636 (for Simple TLS)
                                    </small>
                                </div>
                                <div className="form-check mt-3">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={ldapActiveDirectory}
                                        onChange={e => setLdapActiveDirectory(e.target.checked)}
                                        id="ldapActiveDirectory"
                                        aria-describedby="ldapActiveDirectoryHelp"
                                    />
                                    <label className="form-check-label" htmlFor="ldapActiveDirectory">Is LDAP server an Active Directory (AD) LDAP server?</label>
                                    <small id="ldapActiveDirectoryHelp" className="form-text text-muted">
                                        For AD, <code>NTLMv2</code> authentication is used
                                    </small>
                                </div>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapUid">
                                        LDAP attribute that is used as username
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.uid ? " is-invalid" : "")}
                                        id="ldapUid"
                                        autoComplete="on"
                                        aria-describedby="ldapUidHelp"
                                        value={ldapUid}
                                        required
                                        onChange={e => setLdapUid(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.uid ? formErrors.uid : ""}
                                    </div>
                                    <small id="ldapUidHelp" className="form-text text-muted">
                                        Examples: <code>sAMAccountName</code> for Active Directory, <code>uid</code> for OpenLDAP. This will be appended to <code>user_filter</code> with an <i>&</i> clause.
                                    </small>
                                </div>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapBindDN">
                                        Full distinguished name (DN) of the user who is used for binding
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.bind_dn ? " is-invalid" : "")}
                                        id="ldapBindDN"
                                        autoComplete="on"
                                        aria-describedby="ldapBindDNHelp"
                                        value={ldapBindDN}
                                        onChange={e => setLdapBindDN(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.bind_dn ? formErrors.bind_dn : ""}
                                    </div>
                                    <small id="ldapBindDNHelp" className="form-text text-muted">
                                        Example for OpenLDAP: <code>uid=admin,ou=users,dc=example,dc=org</code>. Example for Active Directory: <code>EXAMPLE\admin</code>.
                                    </small>
                                </div>
                                {ldapBindDN !== "" ? <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapPassword">
                                        Password of the user who is used for binding
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.password ? " is-invalid" : "")}
                                        id="ldapPassword"
                                        autoComplete="on"
                                        value={ldapPassword}
                                        required
                                        onChange={e => setLdapPassword(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.password ? formErrors.password : ""}
                                    </div>
                                </div> : <></>}
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapBase">
                                        DN of the base where users are located
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.base ? " is-invalid" : "")}
                                        id="ldapBase"
                                        autoComplete="on"
                                        aria-describedby="ldapBaseHelp"
                                        value={ldapBase}
                                        required
                                        onChange={e => setLdapBase(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.base ? formErrors.base : ""}
                                    </div>
                                    <small id="ldapBaseHelp" className="form-text text-muted">
                                        Example for OpenLDAP: <code>ou=users,dc=example,dc=com</code>.
                                    </small>
                                </div>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="ldapUserFilter">
                                        User filter (Format can be found in <i>RFC4515</i>)
                                    </label>
                                    <input
                                        type="text"
                                        className={"form-control" + (formErrors.user_filter ? " is-invalid" : "")}
                                        id="ldapUserFilter"
                                        autoComplete="on"
                                        aria-describedby="ldapUserFilterHelp"
                                        value={ldapUserFilter}
                                        required
                                        onChange={e => setLdapUserFilter(e.target.value)}
                                    />
                                    <div className="invalid-feedback">
                                        {formErrors.user_filter ? formErrors.user_filter : ""}
                                    </div>
                                    <small id="ldapUserFilterHelp" className="form-text text-muted">
                                        Examples: <code>(objectClass=User)</code> or <code>(memberOf=cn=gams-engine,ou=groups,dc=example,dc=com)</code> or <code>&((objetClass=User),(employeeType=developer))</code>.
                                    </small>
                                </div>
                                <div className="form-group mt-3 mb-3">
                                    <label htmlFor="encryption">
                                        Encryption method
                                    </label>
                                    <Select
                                        id="encryption"
                                        isClearable={false}
                                        value={ldapAvailableEncryptionMethods.filter(type => type.value === ldapEncryptionMethod)[0]}
                                        isSearchable={true}
                                        onChange={selected => setLdapEncryptionMethod(selected.value)}
                                        options={ldapAvailableEncryptionMethods}
                                    />
                                </div>
                                {ldapEncryptionMethod !== 'plain' ?
                                    <div className="form-check mt-3">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={ldapVerifyCertificates}
                                            onChange={e => setLdapVerifyCertificates(e.target.checked)}
                                            id="ldapVerifyCertificates"
                                            aria-describedby="ldapVerifyCertificatesHelp"
                                        />
                                        <label className="form-check-label" htmlFor="ldapVerifyCertificates">Verify TLS certificate signature?</label>
                                        <small id="ldapVerifyCertificatesHelp" className="form-text text-muted">
                                            Please deactivate this function only if you know what you are doing, as this is a critical security feature!
                                        </small>
                                    </div> : <></>}
                            </>
                        }
                    </fieldset>
                    <div className="mt-3">
                        <SubmitButton isSubmitting={isSubmitting}>
                            {selectedAuthProvider === '__+add_new' ? 'Add Provider' : 'Update'}
                        </SubmitButton>
                    </div>
                </form>
            </div>
        </div>}
        <RemoveAuthProviderModal
            showDialog={showRemoveAuthProviderModal}
            setShowDialog={setShowRemoveAuthProviderModal}
            providerId={selectedAuthProvider}
            setRefreshProviders={setRefreshProviders}
        />
        <Modal show={showUpdateHostnameModal} onHide={() => setShowUpdateHostnameModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>Please Confirm</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                Are you sure you want to update the hostname to: <code>{expectedConfigHostname}</code>? This will invalidate all JWT tokens and consequently log out all users (including yourself).
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowUpdateHostnameModal(false)}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={() => updateHostname(true)}>
                    Update
                </Button>
            </Modal.Footer>
        </Modal>
    </>
    );
};

export default AuthProviderForm;
