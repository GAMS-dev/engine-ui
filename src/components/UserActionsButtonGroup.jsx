import React from "react";
import { Link } from "react-router-dom";

const UserActionsButtonGroup = props => {
  const { id, username, me, isAdmin, setUserToDelete, setDeleteInvitation, handleShowDeleteConfirmDialog } = props;

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
      {isAdmin &&
        <>
          <Link to={`/licenses/${username}`} className="btn btn-sm btn-outline-info">
            Update license
          </Link>
          {username !== "" &&
            <Link to={`/usage/${username}`} className="btn btn-sm btn-outline-info">
              Show usage
          </Link>}
        </>
      }
      {username !== "admin" && (
        username === "" ?
          <>
            <button
              className="btn btn-sm btn-outline-danger"
              data-token={id}
              onClick={showConfirmDialog}>
              Delete
            </button>
          </> :
          <>
            {username !== me &&
              <Link to={`/users/${username}`} className="btn btn-sm btn-outline-info">
                Edit
              </Link>}
            <button
              className="btn btn-sm btn-outline-danger"
              data-user={username}
              onClick={showConfirmDialog}>
              Delete
            </button>
          </>
      )}
    </div>
  );
};
export default UserActionsButtonGroup;
