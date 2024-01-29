import React, { useContext, useEffect, useState } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Tab, Nav } from "react-bootstrap";
import Instances from "./Instances";
import InstanceSubmissionForm from "./InstanceSubmissionForm";
import AuthProviderForm from "./AuthProviderForm.jsx";
import { ServerInfoContext } from "../ServerInfoContext";
import LicUpdateButton from "./LicenseUpdateButton";
import UpdatePasswordPolicyButton from "./UpdatePasswordPolicyButton";

const AdministrationForm = ({ setLicenseExpiration }) => {
    const [serverInfo] = useContext(ServerInfoContext);
    const [activeTab, setActiveTab] = useState("authproviders");
    let location = useLocation();

    useEffect(() => {
        setActiveTab(location.pathname.startsWith("/administration/instances") ? "instances" : "authproviders")
    }, [location]);
    return (
        <>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Administration</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group me-2">
                        <LicUpdateButton type="engine" setLicenseExpiration={setLicenseExpiration} />
                        <LicUpdateButton type="system" />
                    </div>
                    <div className="mr-2">
                        <UpdatePasswordPolicyButton/>
                    </div>
                </div>
            </div>
            {serverInfo.in_kubernetes === true ? <>
                <Tab.Container defaultActiveKey="authproviders" activeKey={activeTab}>
                    <Nav variant="tabs">
                        <Nav.Item>
                            <Nav.Link eventKey="authproviders" as={Link} to={`authproviders`}>Authentication Providers</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="instances" as={Link} to={`instances`}>Instances</Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Tab.Container>
                <Tab.Content>
                    <Routes>
                        <Route path="authproviders">
                            <Route path=":name" element={<AuthProviderForm />} />
                            <Route path="" element={<AuthProviderForm />} />
                            <Route path="*" element={<AuthProviderForm />} />
                        </Route>
                        <Route path="instances">
                            <Route path="update" element={<InstanceSubmissionForm />}>
                                <Route path=":label" element={<InstanceSubmissionForm />} />
                            </Route>
                            <Route path="" element={<Instances />} />
                            <Route path="*" element={<Instances />} />
                        </Route>
                        <Route path="*" element={<AuthProviderForm />} />
                    </Routes>
                </Tab.Content>
            </> :
                <Routes>
                    <Route path="authproviders">
                        <Route path=":name" element={<AuthProviderForm />} />
                        <Route path="" element={<AuthProviderForm />} />
                        <Route path="*" element={<AuthProviderForm />} />
                    </Route>
                    <Route path="*" element={<AuthProviderForm />} />
                </Routes>}
        </>
    );
};

export default AdministrationForm;
