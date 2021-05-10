import React, { useEffect, useContext, useState } from "react";
import { Send, Folder, RefreshCw, Trash2, Save, Users } from "react-feather";
import { Link, useHistory, useLocation } from "react-router-dom";
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

const Models = () => {
  const location = useLocation();
  const history = useHistory();
  const [{ jwt, server, roles }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);

  const [refresh, setRefresh] = useState(0);
  const [refreshModels, setRefreshModels] = useState(0);
  const [tabSelected, setTabSelected] = useState(location.pathname === "/models" ? "models" : "groups");
  const [isLoading, setIsLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [namespace, setNamespace] = useState({ name: "", permission: 0 });
  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showNsModal, setShowNsModal] = useState(false);
  const [showRemoveNsModal, setShowRemoveNsModal] = useState(false);

  useEffect(() => {
    axios
      .get(`${server}/namespaces/permissions/me`)
      .then(res => {
        if (res.status !== 200) {
          setAlertMsg("An error occurred while retrieving namespaces. Please try again later.");
          return;
        }
        const availableNsTmp = res.data
          .filter(ns => ns.permission > 1)
          .sort((a, b) => ('' + a.name).localeCompare(b.name));
        if (availableNsTmp.length === 0) {
          setAlertMsg("You do not have permissions to see any namespaces.");
          return;
        }
        setAvailableNamespaces(availableNsTmp);
        setNamespace(availableNsTmp[0]);
      })
      .catch(err => {
        setAlertMsg(`Problems while retrieving namespaces. Error message: ${getResponseError(err)}.`);
      });
  }, [jwt, server, refresh, setAlertMsg]);

  useEffect(() => {
    if (!namespace || namespace.name === "") {
      return;
    }
    setIsLoading(true);
    if (tabSelected === "groups") {
      axios
        .get(`${server}/namespaces/${namespace.name}/user/groups`)
        .then(res => {
          if (res.status !== 200) {
            setAlertMsg("An error occurred while retrieving user groups. Please try again later.");
            setIsLoading(false);
            return;
          }
          const groupsTmp = res.data
            .map(group => ({
              id: group.label,
              label: group.label,
              created_at: group.created_at,
              created_by: group.created_by.username,
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
    } else {
      axios
        .get(`${server}/namespaces/${namespace.name}`)
        .then(res => {
          if (res.status !== 200) {
            setAlertMsg("An error occurred while retrieving registered models. Please try again later.");
            setIsLoading(false);
            return;
          }
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
  }, [server, namespace, refreshModels, setAlertMsg, tabSelected]);

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
        <h1 className="h2">Models</h1>
      </div>
      <div className="row">
        <div className="col-md-4 col-12 mt-1 font-weight-bold">
          Namespace
      </div>
        <div className="col-md-8 col-12 mt-1 order-2 order-md-1">
          <div className="btn-toolbar mb-2 mb-md-0 float-right">
            <div className="btn-group mr-2">
              {(roles.find(role => role === "admin") !== undefined) &&
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
              {(namespace.permission && 2) === 2 &&
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
                  <Link to={`/models/${namespace.name}`}>
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
        <div className="col-md-4 col-12 order-1 order-md-2 mt-1">
          <ul className="list-group namespace-list" id="list-tab" role="tablist" onClick={updateNamespace}>
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
          <Tabs
            activeKey={tabSelected}
            onSelect={(k) => {
              history.push("/" + k);
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
                  field: "arguments",
                  column: "Arguments",
                  sorter: "alphabetical-array",
                  displayer: args => args ? args.join(",") : ""
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
                  displayer: String

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
          </Tabs>
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
