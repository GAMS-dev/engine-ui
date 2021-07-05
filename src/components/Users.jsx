import React, { useEffect, useContext, useState } from "react";
import { RefreshCw, Send } from "react-feather";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { Link, useHistory } from "react-router-dom";
import moment from "moment";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import UserActionsButtonGroup from "./UserActionsButtonGroup";
import SubmitButton from "./SubmitButton";
import { getResponseError } from "./util";
import LicUpdateButton from "./LicenseUpdateButton";

const Users = props => {
  const { setLicenseExpiration } = props;
  const history = useHistory();

  const [users, setUsers] = useState([]);
  const [userToDelete, setUserToDelete] = useState("");
  const [deleteInvitation, setDeleteInvitation] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteResults, setDeleteResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setAlertMsg] = useContext(AlertContext);
  const [{ jwt, server, roles, username }] = useContext(AuthContext);
  const [displayFields] = useState([
    {
      field: "username,id",
      column: "User",
      sorter: "alphabetical",
      displayer: (user, id) => user === "" ? <span className="badge badge-pill badge-info">unregistered {window.isSecureContext ? '' : `(${id})`}</span> :
        (user === username ?
          <>
            {user}
            <sup>
              <span className="badge badge-pill badge-primary ml-1">me</span>
            </sup>
          </> : user)
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
      displayer: e => e === null ? "" : String(e)
    },
    {
      field: "created",
      column: "Created",
      sorter: "datetime",
      displayer: e => <TimeDisplay time={e} />
    },
    {
      field: "id,username",
      column: "Actions",
      displayer: (id, name) => <UserActionsButtonGroup
        id={id}
        username={name}
        me={username}
        isAdmin={roles.includes("admin")}
        isInviter={roles.includes("inviter")}
        setUserToDelete={setUserToDelete}
        setDeleteInvitation={setDeleteInvitation}
        handleShowDeleteConfirmDialog={() => {
          setDeleteResults(false);
          setShowDeleteConfirmDialog(true);
        }} />
    }
  ]);

  const deleteUser = () => {
    const deleteRequestParams = {};
    if (deleteInvitation) {
      deleteRequestParams['token'] = userToDelete;
    } else {
      deleteRequestParams['username'] = userToDelete;
      deleteRequestParams['delete_results'] = deleteResults;
    }
    axios
      .delete(
        deleteInvitation ?
          `${server}/users/invitation` :
          `${server}/users/`,
        {
          params: deleteRequestParams
        }
      )
      .then(() => {
        if (!deleteInvitation && userToDelete === username) {
          // log me out when I deleted myself
          history.push("/logout");
          return;
        }
        setRefresh(refreshCnt => ({
          refresh: refreshCnt + 1
        }));
        setIsSubmitting(false);
        setShowDeleteConfirmDialog(false);
      })
      .catch(err => {
        setAlertMsg(`Problems deleting user. Error message: ${getResponseError(err)}`);
        setIsSubmitting(false);
        setShowDeleteConfirmDialog(false);
      });
  }
  useEffect(() => {
    setIsLoading(true);
    axios
      .get(`${server}/users/`, {
        params: roles.length ? null : { username: username },
        headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", invitation_time, deleted" }
      })
      .then(res => {
        if (res.status !== 200) {
          setAlertMsg("Problems fetching user information.");
          setIsLoading(false);
          return;
        }
        if (!roles.length) {
          setUsers(res.data
            .filter(user => user.deleted === false)
            .map(user => {
              const newUserInfo = user;
              newUserInfo.id = newUserInfo.username;
              newUserInfo.created = newUserInfo.invitation_time;
              return newUserInfo;
            })
            .sort((a, b) => (moment.utc(b.created) - moment.utc(a.created))));
          setIsLoading(false);
          return;
        }
        axios
          .get(`${server}/users/invitation`, {
            headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", token, used" }
          })
          .then(resInv => {
            if (resInv.status !== 200) {
              setAlertMsg("Problems fetching invitation information.");
              setIsLoading(false);
              return;
            }
            setUsers(res.data
              .filter(user => user.deleted === false)
              .map(user => {
                const newUserInfo = user;
                newUserInfo.id = newUserInfo.username;
                newUserInfo.created = newUserInfo.invitation_time;
                return newUserInfo;
              })
              .concat(resInv.data
                .filter(invitation => invitation.used === false)
                .map(invitation => {
                  const newInvitation = invitation;
                  newInvitation.id = newInvitation.token;
                  newInvitation.username = "";
                  return newInvitation;
                }))
              .sort((a, b) => (moment.utc(b.created) - moment.utc(a.created))));
            setIsLoading(false);
          })
          .catch(err => {
            setAlertMsg(`Problems fetching invitation information. Error message: ${getResponseError(err)}`);
            setIsLoading(false);
          });
      })
      .catch(err => {
        setAlertMsg(`Problems fetching user information. Error message: ${getResponseError(err)}`);
        setIsLoading(false);
      });
  }, [jwt, server, username, roles, refresh, displayFields, setAlertMsg]);


  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Users</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group mr-2">
            {roles && roles.includes("admin") &&
              <>
                <LicUpdateButton type="engine" setLicenseExpiration={setLicenseExpiration} />
                <LicUpdateButton type="system" />
              </>}
            {roles.length ?
              <Link to="/new-user">
                <button type="button" className="btn btn-sm btn-outline-primary">
                  Invite User
                  <Send width="12px" className="ml-2" />
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
              <RefreshCw width="12px" className="ml-2" />
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
              Are you sure you want to delete this {deleteInvitation ? 'invitation' : 'user'}? This cannot be undone!
              {!deleteInvitation && <div className="form-check mt-3">
                <input type="checkbox" className="form-check-input" checked={deleteResults} onChange={e => setDeleteResults(e.target.checked)}
                  id="deleteData" />
                <label className="form-check-label" htmlFor="deleteData">Delete all data associated with this user?</label>
              </div>}
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
