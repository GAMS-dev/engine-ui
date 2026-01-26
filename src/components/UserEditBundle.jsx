import React, { useEffect, useContext, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Nav, Tab } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { ServerInfoContext } from "../ServerInfoContext";
import { AlertContext } from "./Alert";
import { getResponseError } from "./util";
import axios from "axios";

const UserEditBundle = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { userToEdit } = useParams();
    const [userToEditIDP, setUserToEditIDP] = useState(null);
    const [userToEditRoles, setUserToEditRoles] = useState([]);
    const [invalidUserRequest, setInvalidUserRequest] = useState(false);
    const [invalidUserMessage, setInvalidUserMessage] = useState('');
    const [, setAlertMsg] = useContext(AlertContext);


    const [{ server, roles, username }] = useContext(AuthContext);
    const isAdmin = roles && roles.includes("admin");
    const isInviter = roles && roles.includes("inviter");
    const [serverInfo] = useContext(ServerInfoContext);

    const getUserRoleFromArray = (roles) => {
        if (roles == null || roles.length === 0) {
            return "user"
        }
        return roles[0]
    }

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
                    setInvalidUserRequest(true)
                    setInvalidUserMessage(`No data for user: ${userToEdit} found.`)
                    return
                }
                setUserToEditIDP(userInfoReq.data[0].identity_provider);
                setUserToEditRoles(userInfoReq.data[0].roles);
            } catch (err) {
                if (err?.response?.status === 403) {
                    setInvalidUserRequest(true)
                    setInvalidUserMessage(`You do not have permission to view information about user: ${userToEdit}.`);
                    setAlertMsg(`Unauthorized. Error message: ${getResponseError(err)}`);
                } else {
                    setInvalidUserRequest(true)
                    setInvalidUserMessage(`Failed to fetch user information. Error message: ${getResponseError(err)}`);
                    setAlertMsg(`Failed to fetch user information. Error message: ${getResponseError(err)}`);
                }
            }
        }
        fetchUserInfo();
    }, [server, userToEdit, setAlertMsg]);

    return invalidUserRequest ?
        <div className="alert alert-danger mt-3">
            <p><strong>{invalidUserMessage}</strong></p>
        </div> :
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">User: {userToEdit}
                    <sup><small><span className="badge rounded-pill bg-secondary ms-1">{getUserRoleFromArray(userToEditRoles)}</span></small></sup>
                </h1>
            </div>
            {(isAdmin || isInviter) ?
                <>
                    <Tab.Container defaultActiveKey="usage" activeKey={location.pathname.includes('/usage')? 'usage' : location.pathname.split('/').pop()} onSelect={(key) => navigate(key)}>
                        <Nav className="nav-tabs">
                            <Nav.Item>
                                <Nav.Link eventKey="usage">Usage</Nav.Link>
                            </Nav.Item>
                            {!(isInviter && username === userToEdit) && (
                                <>
                                    {(userToEditIDP === "gams_engine") && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="change_pass">Change Password</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(isAdmin) && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="licenses">Change License</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(serverInfo.in_kubernetes === true) && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="instances">Change Instances</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {!userToEditRoles.includes("admin") && (
                                        <Nav.Item>
                                            <Nav.Link eventKey="quotas">Change Quota</Nav.Link>
                                        </Nav.Item>
                                    )}
                                    {(userToEdit !== "admin") && (
                                        <>
                                            <Nav.Item>
                                                <Nav.Link eventKey="identity_provider">Change Identity Provider</Nav.Link>
                                            </Nav.Item>
                                            <Nav.Item>
                                                <Nav.Link eventKey="permissions">Change Permissions</Nav.Link>
                                            </Nav.Item>
                                        </>
                                    )}
                                </>
                            )}
                            <Nav.Item>
                                <Nav.Link eventKey="invitees">Invitees</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Tab.Container>
                    <Tab.Content className="pt-3">
                        <Outlet context={{userToEditRoles}}/>
                    </Tab.Content>
                </>
                :
                <Outlet context={{userToEditRoles}}/>
            }
        </div>
}

export default UserEditBundle;
