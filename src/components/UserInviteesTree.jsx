import React, { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { UserLink } from "./UserLink";
import { getResponseError } from "./util";
import { ClipLoader } from "react-spinners";

const getUserRoleFromArray = (roles) => {
    if (roles == null || roles.length === 0) {
        return "user"
    }
    return roles[0]
}

const TreeNode = ({ username, userRole, userTreeData, isRootNode, inviterList, behindUserToEdit = false }) => {
    const [isOpen, setIsOpen] = useState(isRootNode || inviterList.includes(username) || behindUserToEdit);
    const { userToEdit } = useParams();
    const toggleOpen = () => setIsOpen(prevIsOpen => !prevIsOpen);

    if (userTreeData == null) {
        return
    }

    return (
        <li>
            <div style={{ marginLeft: '20px', display: 'flex', alignItems: 'center' }}>
                {isRootNode === true ? <></> :
                    userTreeData[username] ? (
                        <span onClick={toggleOpen} style={{ cursor: 'pointer', width: '20px' }}>
                            {isOpen ? '▼' : '►'}
                        </span>
                    ) : <span style={{ width: '20px' }}> </span>
                }
                <div>{userRole === "" ?
                    username :
                    (
                        username === userToEdit ? <strong className="text-primary">{username}</strong> : <UserLink user={username} />
                    )}
                    <sup>
                        <span className="badge rounded-pill bg-secondary ms-1">{userRole}</span>
                    </sup>
                </div>
            </div>

            {isOpen && userTreeData[username] && (
                <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
                    {userTreeData[username].map((child, index) => (
                        <TreeNode key={index} username={child.username} userRole={getUserRoleFromArray(child.roles)} userTreeData={userTreeData} inviterList={inviterList} behindUserToEdit={username === userToEdit ? true : behindUserToEdit} />
                    ))}
                </ul>
            )}

            {isOpen && username === userToEdit && !userTreeData[username] && userRole !== "user" && (
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
    const [userTreeData, setUserTreeData] = useState(null);
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);
    const [invalidUserRequest, setInvalidUserRequest] = useState(false);
    const [invalidUserMessage, setInvalidUserMessage] = useState('');
    const [rootInviter, setRootInviter] = useState(userToEdit);
    const [rootInviterRole, setRootInviterRole] = useState("");
    const [inviterList, setInviterList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
                const inviterInfoTmp = {}
                userInfoReq.data.forEach(user => {
                    inviterInfoTmp[user.username] = user.inviter_name
                    if (user.inviter_name == null) {
                        return
                    }
                    if (userTreeDataTmp.hasOwnProperty(user.inviter_name)) {
                        if (user.username === userToEdit) {
                            userTreeDataTmp[user.inviter_name].unshift(user)
                        } else {
                            userTreeDataTmp[user.inviter_name].push(user)
                        }
                    } else {
                        userTreeDataTmp[user.inviter_name] = [user]
                    }
                })
                let rootInviterNameTmp = userToEdit;
                let inviterListTmp = [userToEdit]
                while (true) {
                    if (inviterInfoTmp.hasOwnProperty(rootInviterNameTmp)) {
                        if (inviterInfoTmp[rootInviterNameTmp] != null) {
                            const nextInviterTmp = inviterInfoTmp[rootInviterNameTmp]
                            // already did that above
                            if (rootInviterNameTmp !== userToEdit) {
                                const findRootInviterTmp = rootInviterNameTmp
                                const rootInviterIndex = userTreeDataTmp[nextInviterTmp].findIndex(user => user.username === findRootInviterTmp);
                                const rootInviterObject = userTreeDataTmp[nextInviterTmp][rootInviterIndex]
                                userTreeDataTmp[nextInviterTmp].splice(rootInviterIndex, 1);
                                userTreeDataTmp[nextInviterTmp].unshift(rootInviterObject)
                            }
                            rootInviterNameTmp = nextInviterTmp
                            inviterListTmp.push(rootInviterNameTmp)
                            continue
                        }
                    }
                    break
                }
                setUserTreeData(userTreeDataTmp);
                setInviterList(inviterListTmp);
                setRootInviter(rootInviterNameTmp)
                let inviterRoleTmp = userInfoReq.data.find(user => user.username === rootInviterNameTmp)
                inviterRoleTmp = inviterRoleTmp ? getUserRoleFromArray(inviterRoleTmp.roles) : ""
                setRootInviterRole(inviterRoleTmp);
            } catch (err) {
                setAlertMsg(`Failed to fetch users information. Error message: ${getResponseError(err)}`);
                setInvalidUserRequest(true)
                setInvalidUserMessage(`Failed to fetch users information. Error message: ${getResponseError(err)}`)
            }
            setIsLoading(false)
        }
        fetchUsersInfo();
    }, [server, userToEdit, setAlertMsg]);

    return (
        <>
            <div>
                {isLoading ? <ClipLoader /> :
                    (invalidUserRequest ?
                        <div className="alert alert-danger mt-3">
                            <p><strong>{invalidUserMessage}</strong></p>
                        </div> :
                        <div className="max-main-width">
                            <ul className="pt-3" style={{ listStyleType: 'none', paddingLeft: '0px' }}>
                                <TreeNode username={rootInviter} userRole={rootInviterRole} userTreeData={userTreeData} isRootNode={true} inviterList={inviterList} />
                            </ul>
                        </div>
                    )}
            </div>
        </>
    );
}

export default UserInviteesTree;
