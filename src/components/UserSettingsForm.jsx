import React, { useContext, useEffect, useState } from "react";
import Select from "react-select";
import { UserSettingsContext, availableTablePageLengths } from "./UserSettingsContext";
import DefaultInstanceSelector from "./DefaultInstanceSelector";
import { ServerInfoContext } from "../ServerInfoContext";
import { AuthContext } from "../AuthContext";
import { Alert, Form, Nav, OverlayTrigger, Tab, Tooltip } from "react-bootstrap";
import { Route, Routes, NavLink, useLocation, Navigate } from "react-router-dom";
import { allEvents, getPushSubscription, subscribe, unsubscribe, webpushSupported } from "./webpush";
import ParameterizedWebhookEventsSelector from "./ParameterizedWebhookEventsSelector";
import SubmitButton from "./SubmitButton";
import { AlertContext } from "./Alert";
import { isMobileDevice } from "./util";
import { Info, Share } from "react-feather";
import { ServerConfigContext } from "../ServerConfigContext";

const UserSettingsForm = () => {
    const [{ server, roles }] = useContext(AuthContext);
    const [userSettings, setUserSettings] = useContext(UserSettingsContext)
    const [serverInfo] = useContext(ServerInfoContext);
    const [serverConfig,] = useContext(ServerConfigContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const availableMultUnits = [{ value: "¢/s", label: "¢/s" }, { value: "s/s", label: "s/s" }]
    const [selectedMultUnit, setSelectedMultUnit] = useState(userSettings.multiplierUnit ?? availableMultUnits[0].value)
    const [selectedTablePageLength, setSelectedTablePageLength] = useState(userSettings.tablePageLength)
    const [webPushIsSubmitting, setWebPushIsSubmitting] = useState(false)
    const [webpushSettingsJSON, setWebpushSettingsJSON] = useState(userSettings.webPush)
    const [webPushEvents, setWebPushEvents] = useState(userSettings.webPush ? JSON.parse(userSettings.webPush)['events'] : [allEvents[0]]);
    const [webPushParameterizedEvents, setWebPushParameterizedEvents] = useState(userSettings.webPush ? JSON.parse(userSettings.webPush)['parameterized_events'] : []);
    const [webPushParameterizedEventsValid, setWebPushParameterizedEventsValid] = useState(true);
    const [webPushSubmissionErrorMsg, setWebPushSubmissionErrorMsg] = useState("");
    const [showNotificationForm, setShowNotificationForm] = useState(false);

    const location = useLocation();
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/settings/general')) {
            setActiveTab('general');
        } else if (path.startsWith('/settings/notifications')) {
            setActiveTab('notifications');
        }
    }, [location]);

    useEffect(() => {
        const checkForPushSubscription = async () => {
            const { pushSubscription } = await getPushSubscription(server);
            setShowNotificationForm(pushSubscription != null);
        }
        if (webpushSupported()) {
            checkForPushSubscription();
        }
    }, [server])

    const toggleNotifications = async (enable) => {
        setWebPushSubmissionErrorMsg("");
        if (enable) {
            setShowNotificationForm(true);
            return;
        }
        try {
            const { pushSubscription } = await getPushSubscription(server);
            if (pushSubscription) {
                await unsubscribe(server, pushSubscription, true);
            }
            setWebpushSettingsJSON(null);
            setShowNotificationForm(false);
        } catch (err) {
            setWebPushSubmissionErrorMsg(err.message);
        }
    }


    const updateNotifications = async () => {
        setWebPushIsSubmitting(true);
        setWebPushSubmissionErrorMsg("");
        try {
            await subscribe(server, webPushEvents, webPushParameterizedEvents)
            setWebpushSettingsJSON(JSON.stringify({ events: webPushEvents, parameterized_events: webPushParameterizedEvents }))
            setAlertMsg("success:Notification settings updated")
        } catch (err) {
            setWebPushSubmissionErrorMsg(err.message);
            setWebpushSettingsJSON(null)
        }
        setWebPushIsSubmitting(false);
    }

    useEffect(() => {
        setUserSettings({
            quotaUnit: selectedMultUnit === "¢/s" ? "$" : "h",
            multiplierUnit: selectedMultUnit,
            quotaConversionFactor: selectedMultUnit === "¢/s" ? 100 : 3600,
            tablePageLength: selectedTablePageLength,
            webPush: webpushSettingsJSON
        })
    }, [selectedMultUnit, selectedTablePageLength, setUserSettings, webpushSettingsJSON])

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Settings</h1>
            </div>
            <Tab.Container defaultActiveKey="general" activeKey={activeTab} onSelect={(key) => setActiveTab(key)}>
                <Nav className="nav-tabs">
                    <Nav.Item>
                        <Nav.Link eventKey="general" as={NavLink} to="general">General</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="notifications" as={NavLink} to="notifications">Notifications</Nav.Link>
                    </Nav.Item>
                </Nav>
            </Tab.Container>
            <Tab.Content>
                <Routes>
                    <Route index element={<Navigate to="general" replace />} />
                    <Route path="general" element={<form>
                        <label htmlFor="selectMultUnitInput">
                            Select multiplier unit
                            <span className="ms-1" >
                                <OverlayTrigger placement="bottom"
                                    overlay={<Tooltip id="tooltip">
                                        If ¢/s is selected (cent per second), all quota values are divided by 100 and displayed in $ (U.S. Dollars). If s/s (second per second) is selected, quota values are divided by 3600 and displayed in hours.
                                    </Tooltip>}>
                                    <Info />
                                </OverlayTrigger>
                            </span>
                        </label>
                        <Select
                            id="selectMultUnit"
                            inputId="selectMultUnitInput"
                            isClearable={false}
                            value={availableMultUnits.find(type => type.value === selectedMultUnit)}
                            isSearchable={true}
                            onChange={selected => setSelectedMultUnit(selected.value)}
                            options={availableMultUnits}
                        />
                        <div className="form-group mt-3 mb-3">
                            <label htmlFor="tablePageLengthInput">
                                Default table page length
                            </label>
                            <Select
                                id="tablePageLength"
                                inputId="tablePageLengthInput"
                                isClearable={false}
                                value={availableTablePageLengths.filter(type => type.value === selectedTablePageLength)[0]}
                                isSearchable={true}
                                onChange={selected => setSelectedTablePageLength(selected.value)}
                                options={availableTablePageLengths}
                            />
                        </div>
                        {serverInfo.in_kubernetes === true ? <DefaultInstanceSelector className={"form-group mt-3 mb-3"} /> : <></>}
                    </form>} />
                    <Route path="notifications" element={serverConfig.webhook_access === "ENABLED" || (serverConfig.webhook_access === "ADMIN_ONLY" && roles && roles.includes("admin")) ?
                        webpushSupported() ? <form className="m-auto"
                            onSubmit={e => {
                                e.preventDefault();
                                updateNotifications();
                                return false;
                            }}>
                            <div className="invalid-feedback text-center" style={{ display: webPushSubmissionErrorMsg !== "" ? "block" : "none" }}>
                                {webPushSubmissionErrorMsg}
                            </div>
                            <fieldset disabled={webPushIsSubmitting}>
                                <Form.Check
                                    type="switch"
                                    id="enableNotificationsSwitch"
                                    label="Enable notifications"
                                    className="mt-3"
                                    checked={showNotificationForm}
                                    onChange={e => toggleNotifications(e.target.checked)}
                                />
                                {showNotificationForm ? <>
                                    <div className="mt-3 mb-3">
                                        <label htmlFor="webPushEvents">
                                            Events for which notification should be triggered
                                        </label>
                                        <Select
                                            inputId="webPushEvents"
                                            isClearable={true}
                                            isMulti={true}
                                            isSearchable={true}
                                            placeholder={'Events'}
                                            isDisabled={webPushIsSubmitting}
                                            closeMenuOnSelect={false}
                                            onChange={el => setWebPushEvents(el)}
                                            value={webPushEvents}
                                            options={allEvents}
                                        />
                                    </div>
                                    <ParameterizedWebhookEventsSelector
                                        parameterizedEvents={webPushParameterizedEvents}
                                        setParameterizedEvents={setWebPushParameterizedEvents}
                                        setIsValid={setWebPushParameterizedEventsValid}
                                        isSubmitting={webPushIsSubmitting} />
                                    <div className="mt-3">
                                        <SubmitButton isSubmitting={webPushIsSubmitting} isDisabled={!webPushParameterizedEventsValid}>
                                            Update
                                        </SubmitButton>
                                    </div>
                                </> : <></>}
                            </fieldset>
                        </form> :
                            <Alert variant="danger" className="mt-3">Push notifications are not supported by your browser.
                                {isMobileDevice() ? <> You may need to install the app first (e.g. on iOS by tapping the "Share" <Share size={14} /> button and selecting "Add to home screen).</> : ''}</Alert> :
                        <Alert variant="danger" className="mt-3">Push notifications require webhooks to be enabled.</Alert>} />
                </Routes>
            </Tab.Content>
        </div >
    )
}

export default UserSettingsForm;
