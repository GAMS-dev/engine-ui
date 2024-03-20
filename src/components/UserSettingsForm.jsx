import React, { useContext, useEffect, useState } from "react";
import Select from "react-select";
import { UserSettingsContext } from "./UserSettingsContext";
import DefaultInstanceSelector from "./DefaultInstanceSelector";
import { ServerInfoContext } from "../ServerInfoContext";
import { AuthContext } from "../AuthContext";
import { Alert, Nav, Tab } from "react-bootstrap";
import { Route, Routes, NavLink, useLocation, Navigate } from "react-router-dom";
import { allEvents, subscribe, webpushSupported } from "./webpush";
import ParameterizedWebhookEventsSelector from "./ParameterizedWebhookEventsSelector";
import SubmitButton from "./SubmitButton";
import { AlertContext } from "./Alert";

const UserSettingsForm = ({ webhookAccess }) => {
    const [{ server, roles }] = useContext(AuthContext);
    const [userSettings, setUserSettings] = useContext(UserSettingsContext)
    const [serverInfo] = useContext(ServerInfoContext);
    const [, setAlertMsg] = useContext(AlertContext);

    const availableMulitplierUnits = [{ value: "mults", label: "mults" }, { value: "multh", label: "multh" }]
    const [selectedMulitplierUnit, setSelectedMulitplierUnit] = useState(userSettings.mulitplierUnit)
    const availableTablePageLengths = [{ value: "10", label: "10" }, { value: "20", label: "20" }]
    const [selectedTablePageLength, setSelectedTablePageLength] = useState(userSettings.tablePageLength)
    const [webPushIsSubmitting, setWebPushIsSubmitting] = useState(false)
    const [webpushSettingsJSON, setWebpushSettingsJSON] = useState(userSettings.webPush)
    const [webPushEvents, setWebPushEvents] = useState(userSettings.webPush? JSON.parse(userSettings.webPush)['events']: [allEvents[0]]);
    const [webPushParameterizedEvents, setWebPushParameterizedEvents] = useState(userSettings.webPush? JSON.parse(userSettings.webPush)['parameterized_events']: []);
    const [webPushParameterizedEventsValid, setWebPushParameterizedEventsValid] = useState(true);
    const [webPushSubmissionErrorMsg, setWebPushSubmissionErrorMsg] = useState("");

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


    const updateNotifications = async () => {
        setWebPushIsSubmitting(true);
        setWebPushSubmissionErrorMsg("");
        try {
            await subscribe(server, webPushEvents, webPushParameterizedEvents)
            setWebpushSettingsJSON(JSON.stringify({events: webPushEvents, parameterized_events: webPushParameterizedEvents}))
            setAlertMsg("success:Notification settings updated")
        } catch (err) {
            setWebPushSubmissionErrorMsg(err.message);
            setWebpushSettingsJSON(null)
        }
        setWebPushIsSubmitting(false);
    }

    useEffect(() => {
        setUserSettings({
            mulitplierUnit: selectedMulitplierUnit,
            tablePageLength: selectedTablePageLength,
            webPush: webpushSettingsJSON
        })
    }, [selectedMulitplierUnit, selectedTablePageLength, setUserSettings, webpushSettingsJSON])

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
                        <div className="form-group mt-3 mb-3 ">
                            <label htmlFor="selectMulitplierUnitInput">
                                Multiplier unit
                            </label>
                            <Select
                                id="selectMulitplierUnit"
                                inputId="selectMulitplierUnitInput"
                                isClearable={false}
                                value={availableMulitplierUnits.filter(type => type.value === selectedMulitplierUnit)[0]}
                                isSearchable={true}
                                onChange={selected => setSelectedMulitplierUnit(selected.value)}
                                options={availableMulitplierUnits}
                            />
                        </div>
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
                    <Route path="notifications" element={webhookAccess === "ENABLED" || (webhookAccess === "ADMIN_ONLY" && roles && roles.includes("admin")) ?
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
                            </fieldset>
                        </form> :
                            <Alert variant="danger" className="mt-3">Push notifications are not supported by your browser.</Alert> :
                        <Alert variant="danger" className="mt-3">Push notifications require webhooks to be enabled.</Alert>} />
                </Routes>
            </Tab.Content>
        </div>
    )
}

export default UserSettingsForm;
