import React from "react";
import { Link, Routes, Route } from "react-router-dom";
import { Tab, Nav } from "react-bootstrap";
import Instances from "./Instances";
import InstanceSubmissionForm from "./InstanceSubmissionForm";
import AuthProviderForm from "./AuthProviderForm.jsx";

const AdministrationForm = () => {
    return (
        <>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Administration</h1>
            </div>
            <Tab.Container defaultActiveKey="authproviders">
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
                    <Route path="authproviders" element={<AuthProviderForm />}>
                        <Route path=":name" element={<AuthProviderForm />} />
                    </Route>
                    <Route path="instances">
                        <Route path="update" element={<InstanceSubmissionForm />}>
                            <Route path=":label" element={<InstanceSubmissionForm />} />
                        </Route>
                        <Route path="" element={<Instances />}/>
                        <Route path="*" element={<Instances />}/>
                    </Route>
                    <Route path="*" element={<AuthProviderForm />}/>
                </Routes>
            </Tab.Content>
        </>
    );
};

export default AdministrationForm;
