import React, { useContext } from "react";
import { AlertContext } from "./Alert";

const UserActionsButtonGroup = props => {
  const { id, username, userroles, me, isAdmin, isInviter,
    setUserToDelete, setDeleteInvitation,
    handleShowDeleteConfirmDialog } = props;
  const [, setAlertMsg] = useContext(AlertContext);

  const showConfirmDialog = e => {
    let user = e.target.dataset.user;
    if (user == null) {
      user = e.target.dataset.token;
      setDeleteInvitation(true);
    } else {
      setDeleteInvitation(false);
    }
    setUserToDelete({ username: user, roles: userroles });
    handleShowDeleteConfirmDialog();
  }

  return (
    <div className="btn-group">
      {(isAdmin || (isInviter && username !== me)) && username !== "admin" && setUserToDelete != null && (
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
