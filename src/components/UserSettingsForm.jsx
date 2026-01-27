import { useContext, useEffect, useState } from "react";
import UserSettingsContext from "../contexts/UserSettingsContext";
import { Nav, Tab } from "react-bootstrap";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

const UserSettingsForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [userSettings, setUserSettings] = useContext(UserSettingsContext)

    const [selectedTablePageLength, setSelectedTablePageLength] = useState(userSettings.tablePageLength)
    const [webpushSettingsJSON, setWebpushSettingsJSON] = useState(userSettings.webPush)

    useEffect(() => {
        setUserSettings({
            tablePageLength: selectedTablePageLength,
            webPush: webpushSettingsJSON
        })
    }, [selectedTablePageLength, setUserSettings, webpushSettingsJSON])

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Settings</h1>
            </div>
            <Tab.Container defaultActiveKey="general" activeKey={location.pathname.split('/').pop()} onSelect={(key) => navigate(key)}>
                <Nav className="nav-tabs">
                    <Nav.Item>
                        <Nav.Link eventKey="general">General</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="notifications">Notifications</Nav.Link>
                    </Nav.Item>
                </Nav>
            </Tab.Container>
            <Tab.Content>
                <Outlet context={{
                    selectedTablePageLength, setSelectedTablePageLength,
                    setWebpushSettingsJSON
                }} />
            </Tab.Content>
        </div >
    )
}

export default UserSettingsForm;
