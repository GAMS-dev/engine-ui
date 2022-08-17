import React, { useEffect, useContext, useState } from "react";
import Select from 'react-select';
import { Send, Trash2 } from "react-feather";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import RemoveAuthProviderModal from "./RemoveAuthProviderModal";
import { getResponseError } from "./util";
import axios from "axios";
import { ClipLoader } from "react-spinners";
import SubmitButton from "./SubmitButton";

const AdministrationForm = () => {
    const [{ jwt, server, roles, username }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const [isLoading, setIsLoading] = useState(true);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedAuthProvider, setSelectedAuthProvider] = useState("__add_new");
    const [authProviders, setAuthProviders] = useState([]);

    const [providerName, setProviderName] = useState("");
    const [providerType, setProviderType] = useState("oidc");
    const [issuerID, setIssuerID] = useState("");
    const [useOIDCDiscovery, setUseOIDCDiscovery] = useState(true);

    const [loginButtonLabel, setLoginButtonLabel] = useState("");

    const [showRemoveAuthProviderModal, setShowRemoveAuthProviderModal] = useState(false);

    const availableProviderTypes = [{ value: 'oidc', label: 'OpenID Connect' }];

    useEffect(() => {
        const fetchAuthProviders = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get(`${server}/auth/providers`);
                setAuthProviders(response.data);
                setIsLoading(false);
            } catch (err) {
                setAlertMsg(`Problems retrieving authentication providers. Error message: ${getResponseError(err)}.`);
            }
        }
        fetchAuthProviders();
    }, [jwt, server, roles, username, setAlertMsg]);

    useEffect(() => {
        if (selectedAuthProvider === '__add_new') {
            setProviderName('');
            setProviderType('oidc');
            setLoginButtonLabel('');
            setIssuerID('');
        } else {
            const providerConfig = authProviders.filter(config => config.name === selectedAuthProvider);
            if (providerConfig.length !== 1) {
                setAlertMsg('Invalid provider selected.');
                return;
            }
            setProviderName(providerConfig[0].name);
            if (Object.keys(providerConfig[0]).includes('oidc')) {
                setProviderType('oidc');
                setLoginButtonLabel(providerConfig[0].label);
                setIssuerID(providerConfig[0].oidc.issuer);
            }
        }
    }, [selectedAuthProvider, authProviders, setAlertMsg])

    return (
        <>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Administration</h1>
            </div>
            {isLoading ? <ClipLoader /> : <div className="row">
                <div className="col-md-4 col-12 mt-1 font-weight-bold">
                    Authentication provider
                </div>
                <div className="col-md-8 col-12 mt-1 order-2 order-md-1">
                    <div className="btn-toolbar mb-2 mb-md-0 float-right">
                    </div>
                </div>
                <div className="namespace-list col-md-4 col-12 order-1 order-md-2 mt-1">
                    <ul className="list-group" id="list-tab" role="tablist" onClick={(e) => setSelectedAuthProvider(e.target.dataset.id)}>
                        <li
                            key='__add_new'
                            data-id='__add_new'
                            className={`list-group-item list-group-item-add list-group-item-action${selectedAuthProvider === '__add_new' ? " active" : ""}`}
                        >
                            Add New Provider
                        </li>
                        {authProviders.length && authProviders.map(authProvider => (
                            <li
                                key={authProvider.name}
                                data-id={authProvider.name}
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
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group mt-3 mb-3">
                                <label htmlFor="providerName">
                                    Unique identifier for the provider
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="providerName"
                                    disabled={selectedAuthProvider !== '__add_new'}
                                    autoComplete="on"
                                    value={providerName}
                                    onChange={e => setProviderName(e.target.value)}
                                />
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
                                    isDisabled={selectedAuthProvider !== '__add_new'}
                                    onChange={selected => setProviderType(selected)}
                                    options={availableProviderTypes}
                                />
                            </div>
                            {['oidc'].includes(providerType) && <div className="form-group mt-3 mb-3">
                                <label htmlFor="loginButtonLabel">
                                    Label for the login button
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="loginButtonLabel"
                                    autoComplete="on"
                                    value={loginButtonLabel}
                                    onChange={e => setLoginButtonLabel(e.target.value)}
                                />
                            </div>}
                            {providerType === 'oidc' ?
                                <>
                                    <div className="form-group mt-3 mb-3">
                                        <label htmlFor="issuerID">
                                            URL using the https scheme with no query or fragment component that the OP asserts as its Issuer Identifier
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="issuerID"
                                            autoComplete="on"
                                            value={issuerID}
                                            onChange={e => setIssuerID(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-check mt-3 mb-3">
                                        <input type="checkbox"
                                            className="form-check-input"
                                            checked={useOIDCDiscovery}
                                            onChange={e => setUseOIDCDiscovery(e.target.checked)}
                                            id="useOIDCAutoDiscovery" />
                                        <label className="form-check-label" htmlFor="useOIDCAutoDiscovery">Use OIDC discovery?</label>
                                    </div>
                                </> : <></>
                            }
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                {selectedAuthProvider === '__add_new' ? 'Add Provider' : 'Update'}
                            </SubmitButton>
                        </div>
                    </form>
                </div>
            </div>}
            <RemoveAuthProviderModal
                showDialog={showRemoveAuthProviderModal}
                setShowDialog={setShowRemoveAuthProviderModal}
                providerId={selectedAuthProvider}
            />
        </>
    );
};

export default AdministrationForm;
