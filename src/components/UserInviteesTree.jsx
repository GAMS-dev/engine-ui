import React, { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { UserLink } from "./UserLink";
import { getResponseError } from "./util";


const getUserRoleFromArray = (roles) => {
    if (roles == null || roles.length === 0) {
        return "user"
    }
    return roles[0]
}

const TreeNode = ({ username, userRole, userTreeData, isRootNode }) => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleOpen = () => setIsOpen(prevIsOpen => !prevIsOpen);

    if (userTreeData == null) {
        return
    }

    return (
        <li>
            <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center' }}>
                {userTreeData[username] || isRootNode === true ? (
                    <span onClick={toggleOpen} style={{ cursor: 'pointer', width: '20px' }}>
                        {isOpen ? '▼' : '►'}
                    </span>
                ) : <span style={{ width: '20px' }}> </span>
                }
                <div>{isRootNode === true ? username : <UserLink user={username} />}<sup>
                    <span className="badge rounded-pill bg-secondary ms-1">{userRole}</span></sup></div>
            </div>

            {isOpen && userTreeData[username] && (
                <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
                    {userTreeData[username].map((child, index) => (
                        <TreeNode key={index} username={child.username} userRole={getUserRoleFromArray(child.roles)} userTreeData={userTreeData} />
                    ))}
                </ul>
            )}

            {isOpen && isRootNode === true && !userTreeData[username] && (
                <div style={{ paddingLeft: '20px' }}>
                    <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
                        <div className="text-muted" ><em><small>No invitees</small></em></div>
                    </ul>
                </div>
            )}
        </li>
    );
};

const UserInviteesTree = () => {
    const { userToEdit } = useParams();
    const [userToEditRole, setUserToEditRole] = useState("");
    const [userTreeData, setUserTreeData] = useState(null);
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);
    const [invalidUserRequest, setInvalidUserRequest] = useState(false);
    const [invalidUserMessage, setInvalidUserMessage] = useState('');

    useEffect(() => {
        const fetchUsersInfo = async () => {
            try {
                const userInfoReq = await axios.get(`${server}/users/`, {
                    params: {
                        everyone: true,
                        filter: "deleted=false"
                    }
                });
                const userTreeDataTmp = {}
                userInfoReq.data.forEach(user => {
                    if (user.username === userToEdit) {
                        setUserToEditRole(getUserRoleFromArray(user.roles))
                        return
                    }
                    if (user.inviter_name == null) {
                        return
                    }
                    if (userTreeDataTmp.hasOwnProperty(user.inviter_name)) {
                        userTreeDataTmp[user.inviter_name].push(user)
                    } else {
                        userTreeDataTmp[user.inviter_name] = [user]
                    }

                })
                setUserTreeData(userTreeDataTmp)
            } catch (err) {
                setAlertMsg(`Failed to fetch users information. Error message: ${getResponseError(err)}`);
                setInvalidUserRequest(true)
                setInvalidUserMessage(`Failed to fetch users information. Error message: ${getResponseError(err)}`)
            }
        }
        fetchUsersInfo();
    }, [server, userToEdit, setAlertMsg]);

    return <>{invalidUserRequest ?
        <div className="alert alert-danger mt-3">
            <p><strong>{invalidUserMessage}</strong></p>
        </div> :
        <div className="max-main-width">
            <ul style={{ listStyleType: 'none', paddingLeft: '0px' }}>
                <TreeNode username={userToEdit} userRole={userToEditRole} userTreeData={userTreeData} isRootNode={true} />
            </ul>
        </div>
    }</>
}

export default UserInviteesTree;
