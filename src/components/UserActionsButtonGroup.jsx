import React, { useContext } from "react";
import { Dropdown, DropdownButton } from "react-bootstrap";
import { Link } from "react-router-dom";
import { ServerInfoContext } from "../ServerInfoContext";
import { AlertContext } from "./Alert";

const UserActionsButtonGroup = props => {
  const { id, username, me, isAdmin, isInviter,
    setUserToDelete, setDeleteInvitation,
    handleShowDeleteConfirmDialog } = props;
  const [serverInfo] = useContext(ServerInfoContext);
  const [, setAlertMsg] = useContext(AlertContext);

  const showConfirmDialog = e => {
    let user = e.target.dataset.user;
    if (user == null) {
      user = e.target.dataset.token;
      setDeleteInvitation(true);
    } else {
      setDeleteInvitation(false);
    }
    setUserToDelete(user);
    handleShowDeleteConfirmDialog();
  }

  return (
    <div className="btn-group">
      {(username !== "" && (isAdmin || (isInviter && username !== me))) &&
        <DropdownButton
          id="dropdown-user-actions"
          variant="outline-info"
          size="sm"
          title="Options">
          {isAdmin &&
            <>
              <Dropdown.Item as={Link} to={`/users/${username}/change-pass`}>Change Password</Dropdown.Item>
              <Dropdown.Item as={Link} to={`/users/${username}/licenses`}>Update License</Dropdown.Item>
            </>}
          <Dropdown.Item as={Link} to={`/users/${username}/usage`}>Usage</Dropdown.Item>
          <Dropdown.Item as={Link} to={`/users/${username}/permissions`}>
            Edit Permissions
          </Dropdown.Item>
          <Dropdown.Item as={Link} to={`/users/${username}/quotas`}>
            Edit Quotas
          </Dropdown.Item>
          {serverInfo.in_kubernetes === true &&
            <Dropdown.Item as={Link} to={`/users/${username}/instances`}>
              Edit Instances
            </Dropdown.Item>}
        </DropdownButton>}
      {!isAdmin && username === me &&
        <Link
          to={`/users/${username}/usage`}
          className="btn btn-sm btn-outline-info">Usage</Link>}
      {(isAdmin || (isInviter && username !== me)) && username !== "admin" && (
        username === "" ?
          <>
            {window.isSecureContext && <div>
              <button
                type="button"
                className="btn btn-sm btn-outline-info"
                onClick={() => { navigator.clipboard.writeText(id); setAlertMsg("success:Token copied to clipboard!") }}>
                Copy token
              </button>
            </div>}
            <button
              className="btn btn-sm btn-outline-danger"
              data-token={id}
              onClick={showConfirmDialog}>
              Delete
            </button>
          </>
          :
          <button
            className="btn btn-sm btn-outline-danger"
            data-user={username}
            onClick={showConfirmDialog}>
            Delete
          </button>
      )}
    </div>
  );
};
export default UserActionsButtonGroup;
