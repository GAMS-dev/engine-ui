import React, { useEffect, useContext, useState, useRef } from "react";
import { Send, Folder, RefreshCw, Trash2, Save, Users } from "react-feather";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import ModelActionsButtonGroup from "./ModelActionsButtonGroup";
import AddNamespaceModal from "./AddNamespaceModal";
import RemoveNamespaceModal from "./RemoveNamespaceModal";
import { getResponseError } from "./util";
import axios from "axios";
import AddUserGroupModal from "./AddUserGroupModal";
import GroupActionsButtonGroup from "./GroupActionsButtonGroup";
import { Tab, Tabs } from "react-bootstrap";
import UserActionsButtonGroup from "./UserActionsButtonGroup";

const Models = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedNs } = useParams();
  const refSelectedNs = useRef(selectedNs);
  const [{ jwt, server, roles, username }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);

  const [refresh, setRefresh] = useState(0);
  const [refreshModels, setRefreshModels] = useState(0);
  const [tabSelected, setTabSelected] = useState(location.pathname.startsWith("/models") ? "models" :
    (location.pathname.startsWith("/nsusers") ? "nsusers" : "groups"));
  const [isLoading, setIsLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [namespace, setNamespace] = useState({ name: "", permission: 0 });
  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showNsModal, setShowNsModal] = useState(false);
  const [showRemoveNsModal, setShowRemoveNsModal] = useState(false);

  useEffect(() => {
    axios
      .get(`${server}/namespaces/`, {
        headers: { "X-Fields": "name,permissions" }
      })
      .then(res => {
        if (res.status !== 200) {
          setAlertMsg("An error occurred while retrieving namespaces. Please try again later.");
          return;
        }
        const availableNsTmp = res.data
          .map(ns => ({
            name: ns.name,
            permission: roles && roles.includes("admin") ? [7] : ns.permissions
              .filter(perm => perm.username === username && perm.permission > 1)
              .map(perm => perm.permission)
          }))
          .filter(ns => ns.permission.length > 0)
          .sort((a, b) => ('' + a.name).localeCompare(b.name));
        if (availableNsTmp.length === 0) {
          setAlertMsg("You do not have permissions to see any namespaces.");
          return;
        }
        setAvailableNamespaces(availableNsTmp);
        if (refSelectedNs.current) {
          const nsIdx = availableNsTmp.findIndex(el => el.name === refSelectedNs.current);
          if (nsIdx === -1) {
            setNamespace(availableNsTmp[0]);
          } else {
            setNamespace(availableNsTmp[nsIdx]);
          }
        } else {
          setNamespace(availableNsTmp[0]);
        }
      })
      .catch(err => {
        setAlertMsg(`Problems while retrieving namespaces. Error message: ${getResponseError(err)}.`);
      });
  }, [jwt, server, roles, username, refresh, setAlertMsg]);

  useEffect(() => {
    if (!namespace || namespace.name === "") {
      return;
    }
    setIsLoading(true);
    refSelectedNs.current = namespace.name;
    if (tabSelected === "groups") {
      navigate("/groups/" + encodeURIComponent(namespace.name));
      axios
        .get(`${server}/namespaces/${encodeURIComponent(namespace.name)}/user-groups`)
        .then(res => {
          const groupsTmp = res.data
            .map(group => ({
              id: group.label,
              label: group.label,
              created_at: group.created_at,
              created_by: group.created_by,
              no_members: group.members.length
            }))
            .sort((a, b) => ('' + a.label).localeCompare(b.label));
          setUserGroups(groupsTmp);
          setIsLoading(false);
        })
        .catch(err => {
          setAlertMsg(`Problems while retrieving user groups. Error message: ${getResponseError(err)}.`);
          setIsLoading(false);
        });
    } else if (tabSelected === "nsusers") {
      navigate("/nsusers/" + encodeURIComponent(namespace.name));
      axios
        .get(`${server}/namespaces/`, {
          headers: { "X-Fields": "name,permissions" }
        })
        .then(res => {
          setUsers(res.data
            .filter(ns => ns.name === namespace.name)[0].permissions
            .filter(user => user.permission > 0)
            .map(user => {
              const newUserInfo = user;
              newUserInfo.id = newUserInfo.username;
              return newUserInfo;
            })
            .sort((a, b) => ('' + a.username).localeCompare(b.username)));
          setIsLoading(false);
        })
        .catch(err => {
          setAlertMsg(`Problems while retrieving users in namespace. Error message: ${getResponseError(err)}.`);
          setIsLoading(false);
        });
    } else {
      navigate("/models/" + encodeURIComponent(namespace.name));
      axios
        .get(`${server}/namespaces/${encodeURIComponent(namespace.name)}`)
        .then(res => {
          if (res.data.length > 0) {
            setModels(res.data
              .map(model => {
                const newModel = model;
                newModel.id = model.name;
                return newModel;
              })
              .sort((a, b) => ('' + a.name).localeCompare(b.name)));
            setIsLoading(false);
          } else {
            setModels([]);
          }
          setIsLoading(false);
        })
        .catch(err => {
          setAlertMsg(`Problems while retrieving registered models. Error message: ${getResponseError(err)}.`);
          setIsLoading(false);
        });
    }
  }, [server, namespace, navigate, refreshModels, setAlertMsg, tabSelected]);

  const updateNamespace = e => {
    if (e.target.dataset.ns) {
      setNamespace({
        name: e.target.dataset.ns,
        permission: parseInt(e.target.dataset.permission, 10)
      })
    }
  }
  const handleAddNamespace = () => {
    setAlertMsg("success:Namespace successfully added!");
    setRefresh(refreshCnt => ({
      refresh: refreshCnt + 1
    }));
  }
  const handleRemoveNamespace = () => {
    setAlertMsg("success:Namespace successfully removed!");
    setRefresh(refreshCnt => ({
      refresh: refreshCnt + 1
    }));
  }
  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Namespaces</h1>
      </div>
      <div className="row">
        <div className="col-md-4 col-12 mt-1 font-weight-bold">
          Namespace
        </div>
        <div className="col-md-8 col-12 mt-1 order-2 order-md-1">
          <div className="btn-toolbar mb-2 mb-md-0 float-right">
            <div className="btn-group mr-2">
              {roles && roles.includes("admin") &&
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      setShowNsModal(true);
                    }}
                  >
                    Add Namespace
                    <Folder width="12px" className="ml-2" />
                  </button>
                  {(namespace && namespace.name) &&
                    <Link to={`/quotas/${namespace.name}`}>
                      <button type="button" className="btn btn-sm btn-outline-primary">
                        Edit Quota
                        <Save width="12px" className="ml-2" />
                      </button>
                    </Link>}
                </>
              }
              {(namespace.permission & 2) === 2 &&
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      setShowGroupModal(true);
                    }}
                  >
                    Add Group
                    <Users width="12px" className="ml-2" />
                  </button>
                  <Link to={`/models/${encodeURIComponent(namespace.name)}/new`}>
                    <button type="button" className="btn btn-sm btn-outline-primary">
                      Add Model
                      <Send width="12px" className="ml-2" />
                    </button>
                  </Link>
                </>
              }
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
        <div className="namespace-list col-md-4 col-12 order-1 order-md-2 mt-1">
          <ul className="list-group" id="list-tab" role="tablist" onClick={updateNamespace}>
            {availableNamespaces.length ? availableNamespaces.map(ns => (
              <li
                key={ns.name}
                data-ns={ns.name}
                data-permission={ns.permission}
                className={`list-group-item list-group-item-action${ns.name === namespace.name ? " active" : ""}`}
              >
                {ns.name}
                {(ns.name === namespace.name && roles.find(role => role === "admin") !== undefined) &&
                  <span className="float-right">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        setShowRemoveNsModal(true);
                      }}
                    >
                      <Trash2 width="14px" />
                    </button>
                  </span>
                }
              </li>
            )) : "No Namespace Found"}
          </ul>
        </div>
        <div className="col-md-8 col-12 order-4 mt-1">
          {availableNamespaces.length ?
            <Tabs
              activeKey={tabSelected}
              onSelect={(k) => {
                navigate(`/${k}/${encodeURIComponent(namespace.name)}`);
                setTabSelected(k)
              }}>
              <Tab eventKey="models" title="Models">
                <Table
                  data={models}
                  noDataMsg="No Model Found"
                  isLoading={isLoading}
                  displayFields={[{
                    field: "name",
                    column: "Model",
                    sorter: "alphabetical",
                    displayer: String
                  },
                  {
                    field: "upload_date",
                    column: "Upload date",
                    sorter: "datetime",
                    displayer: e => <TimeDisplay time={e} />
                  },
                  {
                    field: "length",
                    column: "Size",
                    sorter: "numerical",
                    displayer: size => size >= 1e6 ? `${(size / 1e6).toFixed(2)}MB` : `${(size / 1e3).toFixed(2)}KB`
                  },
                  {
                    field: "id",
                    column: "Actions",
                    displayer: id => (
                      <ModelActionsButtonGroup
                        id={id}
                        namespace={namespace}
                        server={server}
                        setRefresh={setRefreshModels} />
                    )
                  }]}
                  idFieldName="id"
                  sortedAsc={true}
                  sortedCol="name"
                />
              </Tab>
              <Tab eventKey="groups" title="Groups">
                <Table
                  data={userGroups}
                  noDataMsg="No Group Found"
                  isLoading={isLoading}
                  displayFields={[{
                    field: "label",
                    column: "Label",
                    sorter: "alphabetical",
                    displayer: String
                  },
                  {
                    field: "created_at",
                    column: "Created",
                    sorter: "datetime",
                    displayer: e => <TimeDisplay time={e} />
                  },
                  {
                    field: "created_by",
                    column: "Created By",
                    sorter: "alphabetical",
                    displayer: user => user.deleted ?
                      <span className="badge badge-pill badge-secondary ml-1">deleted</span> : user.username

                  },
                  {
                    field: "no_members",
                    column: "Members",
                    sorter: "numerical",
                    displayer: Number

                  },
                  {
                    field: "id",
                    column: "Actions",
                    displayer: id => (
                      <GroupActionsButtonGroup
                        id={id}
                        namespace={namespace}
                        server={server}
                        roles={roles}
                        setRefresh={setRefreshModels} />
                    )
                  }]}
                  idFieldName="id"
                  sortedAsc={true}
                  sortedCol="label"
                />
              </Tab>
              <Tab eventKey="nsusers" title="Users">
                <Table
                  data={users}
                  noDataMsg="No User Found"
                  isLoading={isLoading}
                  displayFields={[{
                    field: "id,username",
                    column: "User",
                    sorter: "alphabetical",
                    displayer: user =>
                      user === username ?
                        <>
                          {user}
                          <sup>
                            <span className="badge badge-pill badge-primary ml-1">me</span>
                          </sup>
                        </> : user
                  },
                  {
                    field: "permission",
                    column: "Permissions",
                    sorter: "numerical",
                    displayer: Number
                  },
                  {
                    field: "username",
                    column: "Actions",
                    displayer: name => <UserActionsButtonGroup
                      username={name}
                      me={username}
                      isAdmin={roles && roles.includes("admin")}
                      isInviter={roles && roles.includes("inviter")} />
                  }]}
                  idFieldName="id"
                  sortedAsc={true}
                  sortedCol="id"
                />
              </Tab>
            </Tabs> : "No Namespace Found"}
        </div>
      </div>
      <AddNamespaceModal
        showDialog={showNsModal}
        setShowDialog={setShowNsModal}
        handleSuccess={handleAddNamespace}
        existingNamespaces={availableNamespaces.map(ns => ns.name)}
      />
      <RemoveNamespaceModal
        showDialog={showRemoveNsModal}
        setShowDialog={setShowRemoveNsModal}
        handleSuccess={handleRemoveNamespace}
        namespace={namespace.name}
      />
      <AddUserGroupModal
        showDialog={showGroupModal}
        setShowDialog={setShowGroupModal}
        handleSuccess={() => setRefresh(cnt => cnt + 1)}
        namespace={namespace.name}
      />
    </>
  );
};

export default Models;
