import React, { useEffect, useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { Nav, Tab } from "react-bootstrap";
import { Route, Routes, NavLink, useLocation, Navigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { ServerInfoContext } from "../ServerInfoContext";
import Usage from "./Usage";
import UserChangePassForm from "./UserChangePassForm";
import UserInstanceUpdateForm from "./UserInstanceUpdateForm";
import UserPermissionUpdateForm from "./UserPermissionUpdateForm";
import UserQuotaUpdateForm from "./UserQuotaUpdateForm";
import UserUpdateIdentityProviderForm from "./UserUpdateIdentityProviderForm";
import LicenseUpdateForm from "./LicenseUpdateForm";
import { AlertContext } from "./Alert";
import { getResponseError } from "./util";
import axios from "axios";

const UserEditBundle = () => {

    const { userToEdit } = useParams();
    const [activeTab, setActiveTab] = useState('usage');
    const [userToEditIDP, setUserToEditIDP] = useState(null);
    const [userToEditIsAdmin, setUserToEditIsAdmin] = useState(null);
    const [invalidUser, setInvalidUser] = useState(false);
    const location = useLocation();
    const [, setAlertMsg] = useContext(AlertContext);


    const [{ server, roles, username }] = useContext(AuthContext);
    const isAdmin = roles && roles.includes("admin");
    const isInviter = roles && roles.includes("inviter");
    const [serverInfo] = useContext(ServerInfoContext);

    useEffect(() => {
        const path = location.pathname;
        if (path.includes('/usage')) {
            setActiveTab('usage');
        } else if (path.endsWith('/change_pass')) {
            setActiveTab('change_pass');
        } else if (path.endsWith('/instances')) {
            setActiveTab('instances');
        } else if (path.endsWith('/quotas')) {
            setActiveTab('quotas');
        } else if (path.endsWith('/identity_provider')) {
            setActiveTab('identity_provider');
        } else if (path.endsWith('/permissions')) {
            setActiveTab('permissions');
        } else if (path.endsWith('/licenses')) {
            setActiveTab('licenses');
        }
    }, [location]);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const userInfoReq = await axios.get(`${server}/users/`, {
                    params: {
                        username: userToEdit,
                        everyone: true,
                        filter: "deleted=false"
                    }
                });
                if (userInfoReq.data?.length === 0) {
                    setInvalidUser(true)
                    return
                }
                setUserToEditIDP(userInfoReq.data[0].identity_provider);
                setUserToEditIsAdmin(userInfoReq.data[0].roles?.includes("admin") === true);
            } catch (err) {
                if (err?.response?.status === 403) {
                    setInvalidUser(true)
                }
                setAlertMsg(`Failed to fetch user information. Error message: ${getResponseError(err)}`);
            }
        }
        fetchUserInfo();
    }, [server, userToEdit, setAlertMsg]);

    return invalidUser ?
            <div className="alert alert-danger mt-3">
                <p><strong>You do not have permission to view information about user: {userToEdit}.</strong></p>
            </div> :
                <div>
                    <h1 className="h2">User: {userToEdit}</h1>
                    {(isAdmin || (isInviter && username !== userToEdit)) ?
                        <>
                            <Tab.Container defaultActiveKey="quotas" activeKey={activeTab} onSelect={(key) => setActiveTab(key)}>
                                <Nav className="nav-tabs">
                                    <Nav.Item>
                                        <Nav.Link eventKey="usage" as={NavLink} to="usage">Usage</Nav.Link>
                                    </Nav.Item>
                                    {(userToEditIDP === "gams_engine") && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="change_pass" as={NavLink} to="change_pass">Change Password</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(isAdmin) && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="licenses" as={NavLink} to="licenses">Change License</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(serverInfo.in_kubernetes === true) && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="instances" as={NavLink} to="instances">Change Instances</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(!userToEditIsAdmin) && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="quotas" as={NavLink} to="quotas">Change Quota</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(userToEdit !== "admin") && (
                                        <>
                                            <Nav.Item>
                                                <Nav.Link eventKey="identity_provider" as={NavLink} to="identity_provider">Change Identity Provider</Nav.Link>
                                            </Nav.Item>
                                            <Nav.Item>
                                                <Nav.Link eventKey="permissions" as={NavLink} to="permissions">Change Permissions</Nav.Link>
                                            </Nav.Item>
                                        </>
                                    )}
                                </Nav>
                            </Tab.Container>
                            <Tab.Content className="pt-3">
                                <Routes>
                                    <Route index element={<Navigate to="usage" replace />} />
                                    <Route path="usage/*" element={<Usage />} />
                                    <Route path="change_pass" element={<UserChangePassForm hideTitle={true} />} />
                                    {(isAdmin) && (
                                        <Route path="licenses" element={<LicenseUpdateForm />} />
                                    )}
                                    {(serverInfo.in_kubernetes === true) && (
                                        <Route path="instances" element={<UserInstanceUpdateForm />} />
                                    )}
                                    <Route path="quotas" element={<UserQuotaUpdateForm />} />
                                    <Route path="identity_provider" element={<UserUpdateIdentityProviderForm />} />
                                    <Route path="permissions" element={<UserPermissionUpdateForm />} />
                                </Routes>
                            </Tab.Content>
                        </>
                        :
                        <Usage />
                    }
                </div>
}

export default UserEditBundle;
