import React from "react";
import { Dropdown, DropdownButton } from "react-bootstrap";
import { Link } from "react-router-dom";

const UserActionsButtonGroup = props => {
  const { id, username, me, isAdmin, isInviter, setUserToDelete, setDeleteInvitation, handleShowDeleteConfirmDialog } = props;

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
              <Dropdown.Item as={Link} to={`/users/${username}/usage`}>Usage</Dropdown.Item>
            </>}
          {(isAdmin || (isInviter && username !== me)) &&
            <>
              <Dropdown.Item as={Link} to={`/users/${username}/permissions`}>
                Edit Permissions
              </Dropdown.Item>
              <Dropdown.Item as={Link} to={`/users/${username}/quotas`}>
                Edit Quotas
              </Dropdown.Item>
              <Dropdown.Item as={Link} to={`/users/${username}/instances`}>
                Edit Instances
              </Dropdown.Item>
            </>}
        </DropdownButton>}
      {username !== "admin" && (
        username === "" ?
          <button
            className="btn btn-sm btn-outline-danger"
            data-token={id}
            onClick={showConfirmDialog}>
            Delete
            </button>
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
