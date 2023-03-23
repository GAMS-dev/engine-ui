import React, { useState, useContext } from "react";
import Select from 'react-select';
import DatePicker from "react-datepicker";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import { useEffect } from "react";
import { Button } from "react-bootstrap";

const CreateAuthTokenForm = () => {
    const [{ server, isOAuthToken }] = useContext(AuthContext);

    const [authToken, setAuthToken] = useState("");
    const [expirationDate, setExpirationDate] = useState(new Date(new Date().setDate(new Date().getDate() + 7)));
    const [availableScopes, setAvailableScopes] = useState([]);
    const [selectedScopes, setSelectedScopes] = useState([]);
    const [readonlyToken, setReadonlyToken] = useState(false);
    const [copySuccessMsg, setCopySuccessMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState("");

    const maxSeconds = 16070400;
    const minSeconds = 60;

    useEffect(() => {
        const availableScopesTmp = [{ value: "CONFIGURATION", label: "Engine configuration" },
        { value: "NAMESPACES", label: "Namespaces/Models/Groups" },
        { value: "JOBS", label: "Jobs" },
        { value: "HYPERCUBE", label: "Hypercube jobs" },
        { value: "USERS", label: "Users" },
        { value: "CLEANUP", label: "Cleanup" },
        { value: "USAGE", label: "Usage/Quotas/Instances" },
        { value: "LICENSES", label: "Licenses" }];
        if (!isOAuthToken) {
            availableScopesTmp.push({ value: "AUTH", label: "Authentication" });
        }
        setAvailableScopes(availableScopesTmp);
    }, [isOAuthToken])

    const createAuthToken = async () => {
        setIsSubmitting(true);
        setSubmissionErrorMsg("");
        setFormErrors("");
        try {
            const authTokenForm = new FormData();
            authTokenForm.append('expires_in',
                Math.max(minSeconds,
                    Math.min(maxSeconds,
                        Math.round((expirationDate.getTime() - new Date().getTime()) / 1000))));
            let scopeTmp = selectedScopes.map(scope => scope.value).join(' ');
            if (readonlyToken) {
                if (selectedScopes.length === 0) {
                    // have to manually add all scopes, else user will have no access
                    scopeTmp = availableScopes.map(scope => scope.value).join(' ');
                }
                scopeTmp += ' READONLY';
            }
            authTokenForm.append('scope', scopeTmp);
            const response = await axios.post(`${server}/auth/`, authTokenForm);
            setAuthToken(response.data['token']);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                setFormErrors(err.response.data.errors);
                setSubmissionErrorMsg('Problems creating authentication token.');
            } else {
                setSubmissionErrorMsg(`Problems creating authentication token. Error message: ${getResponseError(err)}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            {authToken === "" ?
                <div>
                    <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                        <h1 className="h2">Create Authentication Token</h1>
                    </div>
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            createAuthToken();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group mt-3 mb-3">
                                <label htmlFor="ldapPort">
                                    Expiration date
                                </label>
                                <DatePicker
                                    showTimeSelect
                                    timeInputLabel="Time:"
                                    dateFormat="MM/dd/yyyy h:mm aa"
                                    selected={expirationDate}
                                    minDate={new Date(new Date().setSeconds(new Date().getSeconds() + minSeconds))}
                                    maxDate={new Date(new Date().setSeconds(new Date().getSeconds() + maxSeconds))}
                                    inline
                                    onChange={date => setExpirationDate(date)} />
                                <div className="invalid-feedback">
                                    {formErrors.expires_in ? formErrors.expires_in : ""}
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="accessScopes">
                                    Access scopes
                                </label>
                                <Select
                                    id="accessScopes"
                                    placeholder="Full access"
                                    value={selectedScopes}
                                    isSearchable={true}
                                    isClearable={true}
                                    isMulti={true}
                                    closeMenuOnSelect={false}
                                    blurInputOnSelect={false}
                                    onChange={selected => setSelectedScopes(selected)}
                                    options={availableScopes}
                                />
                                <div className="invalid-feedback">
                                    {formErrors.scope ? formErrors.scope : ""}
                                </div>
                            </div>
                            <div className="form-group form-check mt-3 mb-3">
                                <input type="checkbox"
                                    className="form-check-input"
                                    checked={readonlyToken}
                                    onChange={e => setReadonlyToken(e.target.checked)}
                                    id="readonlyToken" />
                                <label className="form-check-label" htmlFor="readonlyToken">Readonly access?</label>
                            </div>
                        </fieldset>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Create Authentication Token
                            </SubmitButton>
                        </div>
                    </form>
                </div>
                :
                <>
                    <div className="mt-5">Your authentication token:
                        <div className="auth-token-field"><code>{authToken}</code></div>
                    </div>
                    {window.isSecureContext && <div>
                        <button
                            type="button"
                            className="btn btn-link"
                            onClick={() => { navigator.clipboard.writeText(authToken); setCopySuccessMsg("Copied!"); }}>
                            Copy to clipboard
                        </button>
                        {copySuccessMsg}
                    </div>}
                    <Button variant="primary" onClick={() => {
                        setCopySuccessMsg("");
                        setAuthToken("");
                    }}>OK</Button>
                </>}
        </>);
}

export default CreateAuthTokenForm;
