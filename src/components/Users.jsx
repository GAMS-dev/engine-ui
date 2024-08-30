import React, { useEffect, useContext, useState } from "react";
import { RefreshCw, Send } from "react-feather";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import UserActionsButtonGroup from "./UserActionsButtonGroup";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import { UserLink } from "./UserLink";

const Users = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [userToDelete, setUserToDelete] = useState({ username: "", roles: [] });
  const [deleteInvitation, setDeleteInvitation] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteResults, setDeleteResults] = useState(false);
  const [deleteChildren, setDeleteChildren] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setAlertMsg] = useContext(AlertContext);
  const [{ jwt, server, roles, username }] = useContext(AuthContext);
  const isAdmin = roles && roles.includes("admin");
  const isInviter = roles && roles.includes("inviter");
  const [displayFields] = useState([
    {
      field: "username,id",
      column: "User",
      sorter: "alphabetical",
      displayer: (user, id) => user === "" ? <span className="badge rounded-pill bg-info">unregistered {window.isSecureContext ? '' : `(${id})`}</span> :
        <UserLink user={user} />
    },
    {
      field: "roles",
      column: "Role",
      sorter: "alphabetical-array",
      displayer: e => e.join(",")
    },
    {
      field: "inviter_name",
      column: "Invited by",
      sorter: "alphabetical",
      displayer: (user) =>
        isAdmin ? <UserLink user={user} /> : user
    },
    {
      field: "created",
      column: "Created",
      sorter: "datetime",
      displayer: e => e == null ? "-" : <TimeDisplay time={e} />
    },
    {
      field: "id,username,roles,identity_provider",
      column: "Actions",
      displayer: (id, name, roles) => <UserActionsButtonGroup
        id={id}
        username={name}
        userroles={roles}
        me={username}
        isAdmin={isAdmin}
        isInviter={isInviter}
        setUserToDelete={setUserToDelete}
        setDeleteInvitation={setDeleteInvitation}
        handleShowDeleteConfirmDialog={() => {
          setDeleteResults(false);
          setDeleteChildren(true);
          setShowDeleteConfirmDialog(true);
        }} />
    }
  ]);

  const deleteUser = async () => {
    const deleteRequestParams = {};
    if (deleteInvitation) {
      deleteRequestParams['token'] = userToDelete.username;
    } else {
      deleteRequestParams['username'] = userToDelete.username;
      deleteRequestParams['delete_results'] = deleteResults;
      deleteRequestParams['delete_children'] = deleteChildren;
    }
    try {
      await axios.delete(
        deleteInvitation ? `${server}/users/invitation` : `${server}/users/`,
        { params: deleteRequestParams }
      )
    } catch (err) {
      setAlertMsg(`Problems deleting user. Error message: ${getResponseError(err)}`);
      setIsSubmitting(false);
      setShowDeleteConfirmDialog(false);
      return
    }
    if (!deleteInvitation && userToDelete.username === username) {
      // log me out when I deleted myself
      navigate("/logout");
      return;
    }
    setRefresh(refreshCnt => ({
      refresh: refreshCnt + 1
    }));
    setIsSubmitting(false);
    setShowDeleteConfirmDialog(false);
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const queryParamsUsersQuery = roles?.length ? {} : { username: username };
      queryParamsUsersQuery['filter'] = 'deleted=false';
      const queryParamsInvitationsQuery = roles?.length ? {} : { everyone: roles?.includes("admin") };
      queryParamsInvitationsQuery['filter'] = 'used=false';

      try {
        const queries = [
          axios.get(`${server}/users/`, {
            params: queryParamsUsersQuery,
            headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", invitation_time, deleted, identity_provider" }
          })];
        if (roles?.length > 0) {
          queries.push(axios.get(`${server}/users/invitation`, {
            headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", token, used" },
            params: queryParamsInvitationsQuery
          }))
        }
        const reponses = await Promise.all(queries);
        let userDataTmp = reponses[0].data
          .map(user => {
            const newUserInfo = user;
            newUserInfo.id = newUserInfo.username;
            newUserInfo.created = newUserInfo.invitation_time;
            return newUserInfo;
          });
        if (roles?.length > 0) {
          userDataTmp = userDataTmp.concat(reponses[1].data
            .map(invitation => {
              const newInvitation = invitation;
              newInvitation.id = newInvitation.token;
              newInvitation.username = "";
              return newInvitation;
            }));
        }
        setUsers(userDataTmp
          .sort((a, b) => (moment.utc(b.created) - moment.utc(a.created))));
      } catch (err) {
        setAlertMsg(`Problems fetching user information. Error message: ${getResponseError(err)}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [jwt, server, username, roles, refresh, displayFields, setAlertMsg]);


  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Users</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            {roles.length ?
              <Link to="/new-user">
                <button type="button" className="btn btn-sm btn-outline-primary">
                  Invite User
                  <Send width="12px" className="ms-2" />
                </button>
              </Link> : <></>}
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setRefresh(refresh + 1);
              }}
            >
              Refresh
              <RefreshCw width="12px" className="ms-2" />
            </button>
          </div>
        </div>
      </div>
      <Table data={users}
        noDataMsg="No User Found"
        displayFields={displayFields}
        sortedAsc={false}
        isLoading={isLoading}
        sortedCol="created"
        idFieldName="id" />
      <Modal show={showDeleteConfirmDialog} onHide={() => setShowDeleteConfirmDialog(false)}>
        <form
          onSubmit={e => {
            e.preventDefault();
            deleteUser();
            return false;
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Please Confirm</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <fieldset disabled={isSubmitting}>
              Are you sure you want to remove the {deleteInvitation ? 'invitation' : 'user'}: <code>{userToDelete.username}</code>? This cannot be undone!
              {!deleteInvitation &&
                <>
                  <div className="form-check mt-3">
                    <input type="checkbox" className="form-check-input" checked={deleteResults} onChange={e => setDeleteResults(e.target.checked)}
                      id="deleteData" />
                    <label className="form-check-label" htmlFor="deleteData">Delete all data associated with this user?</label>
                  </div>
                  {userToDelete.roles.length > 0 &&
                    <div className="form-check mt-3">
                      <input type="checkbox" className="form-check-input" checked={deleteChildren} onChange={e => setDeleteChildren(e.target.checked)}
                        id="deleteChildren" />
                      <label className="form-check-label" htmlFor="deleteChildren">Also delete all invitees of this user?</label>
                    </div>}
                </>}
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteConfirmDialog(false)}>
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
              Delete
            </SubmitButton>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
