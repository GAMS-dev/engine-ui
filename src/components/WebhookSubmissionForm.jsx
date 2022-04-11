import axios from "axios";
import React, { useState, useContext } from "react";
import { Redirect, useParams } from "react-router-dom";
import Select from 'react-select';
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";

const WebhookSubmissionForm = () => {
    const { label } = useParams();
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server, roles }] = useContext(AuthContext);

    const allContentTypes = [{ value: 'json', label: 'JSON' }, { value: 'form', label: 'Form' }];
    const allEvents = [{ value: 'ALL', label: 'All events' }, { value: 'JOB_FINISHED', label: 'Job finished' },
    { value: 'HC_JOB_FINISHED', label: 'Hypercube job finished' }];

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [formErrors, setFormErrors] = useState("");
    const [url, setUrl] = useState("");
    const [urlValid, setUrlValid] = useState(false);
    const [secret, setSecret] = useState("");
    const [recursive, setRecursive] = useState(false);
    const [contentType, setContentType] = useState(allContentTypes[0]);
    const [events, setEvents] = useState(allEvents[0]);
    const [insecureSsl, setInsecureSsl] = useState(false);
    const [showInsecureSslCheckbox, setShowInsecureSslCheckbox] = useState(false);
    const [webhookCreated, setWebhookCreated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleWebhookSubmission = async () => {
        if (urlValid !== true) {
            return;
        }
        if (events.length < 1) {
            setFormErrors({ events: 'At least one event must be selected' });
            return;
        }
        setFormErrors({});
        setIsSubmitting(true);
        try {
            const webhookSubmissionForm = new FormData();
            webhookSubmissionForm.append("url", url);
            webhookSubmissionForm.append("secret", secret);
            webhookSubmissionForm.append("recursive", recursive);
            webhookSubmissionForm.append("content_type", contentType.value);
            webhookSubmissionForm.append("insecure_ssl", insecureSsl);
            if (Array.isArray(events)) {
                for (let i = 0; i < events.length; i++) {
                    webhookSubmissionForm.append("events", events[i].value);
                }
            } else {
                webhookSubmissionForm.append("events", events.value);
            }

            await axios.post(`${server}/users/webhooks`, webhookSubmissionForm);
            setAlertMsg('success:Webhook created successfully');
            setWebhookCreated(true);
        }
        catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                const formErrorsTmp = {};
                ['url', 'secret', 'events'].forEach(key => {
                    if (err.response.data.errors.hasOwnProperty(key)) {
                        formErrorsTmp[key] = err.response.data.errors[key]
                    }
                });
                setFormErrors(formErrorsTmp);
                setSubmissionErrorMsg('Problems creating webhook instance.');
            } else {
                setSubmissionErrorMsg(`Problems creating webhook. Error message: ${getResponseError(err)}`);
            }
            setIsSubmitting(false);
        }
    }
    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Add new Webhook</h1>
            </div>
            <form
                className="m-auto"
                onSubmit={e => {
                    e.preventDefault();
                    handleWebhookSubmission();
                    return false;
                }}
            >
                <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                    {submissionErrorMsg}
                </div>
                <div className="row">
                    <div className="col-md-6 col-12">
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor="instanceLabel">
                                    Payload URL
                                </label>
                                <input
                                    type="text"
                                    className={"form-control" + (urlValid !== true || formErrors.url ? " is-invalid" : "")}
                                    id="url"
                                    aria-describedby="urlHelp"
                                    required
                                    value={url}
                                    onChange={e => {
                                        setUrl(e.target.value);
                                        try {
                                            const url_validated = new URL(e.target.value);
                                            setUrlValid(['http:', 'https:'].includes(url_validated.protocol));
                                            setShowInsecureSslCheckbox(url_validated.protocol === 'https:');
                                        } catch (err) {
                                            setUrlValid(false);
                                            setShowInsecureSslCheckbox(false);
                                        }
                                    }
                                    }
                                />
                                <div className="invalid-feedback">
                                    {formErrors.url ? formErrors.url : ""}
                                </div>
                                <small id="urlHelp" className="form-text text-muted">
                                    URL of the server that receives the webhook requests. Only <i>HTTP</i> and <i>HTTPS</i> protocols supported.
                                </small>
                            </div>
                        </fieldset>
                    </div>
                    <div className="col-md-6 col-12">
                        <fieldset disabled={isSubmitting}>
                            {showInsecureSslCheckbox &&
                                <div className="form-check mt-4">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="insecureSsl"
                                        checked={insecureSsl}
                                        onChange={e => setInsecureSsl(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="insecureSsl">
                                        Disable SSL certificate validation (strongly discouraged)?
                                    </label>
                                </div>}
                        </fieldset>
                    </div>
                </div>
                <div className="row">
                    <div className="col-md-6 col-12">
                        <fieldset disabled={isSubmitting}>
                            <div className="form-group">
                                <label htmlFor="cpuReq">
                                    Secret token
                                </label>
                                <input
                                    type="text"
                                    className={"form-control" + (formErrors.secret ? " is-invalid" : "")}
                                    id="secret"
                                    aria-describedby="secretHelp"
                                    value={secret}
                                    onChange={e => setSecret(e.target.value)}
                                />
                                <div className="invalid-feedback">
                                    {formErrors.secret ? formErrors.secret : ""}
                                </div>
                                <small id="secretHelp" className="form-text text-muted">
                                    Used to authenticate payload of webhook via <i>HMAC-SHA256</i>. HMAC is sent in the HTTP header <code>X-ENGINE-HMAC</code>.
                                </small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="events">
                                    Events for which webhook should be triggered
                                </label>
                                <Select
                                    id="events"
                                    isClearable={true}
                                    isMulti={true}
                                    isSearchable={true}
                                    placeholder={'Events'}
                                    isDisabled={isSubmitting}
                                    closeMenuOnSelect={false}
                                    onChange={el => setEvents(el)}
                                    styles={{
                                        control: styles => ({
                                            ...styles,
                                            borderColor: formErrors.events ? 'red' : styles.borderColor,
                                            '&:hover': {
                                                borderColor: formErrors.events ? 'red' : styles['&:hover'].borderColor,
                                            }
                                        })
                                    }}
                                    value={events}
                                    options={allEvents}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="contentType">
                                    Content type
                                </label>
                                <Select
                                    id="contentType"
                                    isClearable={false}
                                    value={contentType}
                                    isDisabled={isSubmitting}
                                    isSearchable={false}
                                    onChange={el => setContentType(el)}
                                    options={allContentTypes}
                                />
                                <small id="secretHelp" className="form-text text-muted">
                                    Webhooks can be sent either as <code>application/x-www-form-urlencoded</code> or as <code>application/json</code>.
                                </small>
                            </div>
                            {(roles && (roles.includes("inviter") || roles.includes("admin"))) &&
                                <div className="form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="recursive"
                                        checked={recursive}
                                        onChange={e => setRecursive(e.target.checked)}
                                    />
                                    <label className="form-check-label" htmlFor="recursive">
                                        {roles.includes("admin") ? 'Register webhook globally for all users?' : 'Register webhook for all your invitees as well?'}
                                    </label>
                                </div>}
                        </fieldset>
                    </div>
                </div>
                <div className="mt-3">
                    <SubmitButton isSubmitting={isSubmitting}>
                        Add Webhook
                    </SubmitButton>
                </div>
                {webhookCreated && <Redirect to="/webhooks" />}
            </form >
        </div >
    );
}

export default WebhookSubmissionForm;
