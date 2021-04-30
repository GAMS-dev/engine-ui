import React, { useEffect, useContext, useState } from "react";
import { Send, Folder, RefreshCw, Trash2, Save } from "react-feather";
import { Link } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import ModelActionsButtonGroup from "./ModelActionsButtonGroup";
import AddNamespaceModal from "./AddNamespaceModal";
import RemoveNamespaceModal from "./RemoveNamespaceModal";
import { getResponseError } from "./util";
import axios from "axios";

const Models = () => {
  const [{ jwt, server, roles }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);

  const [refresh, setRefresh] = useState(0);
  const [refreshModels, setRefreshModels] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [namespace, setNamespace] = useState({ name: "", permission: 0 });
  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [showNsModal, setShowNsModal] = useState(false);
  const [showRemoveNsModal, setShowRemoveNsModal] = useState(false);

  const [displayFields, setDisplayFields] = useState([]);

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
    setIsLoading(true);
    if (namespace.name !== "") {
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
          const newDisplayFields = [{
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
            displayer: args => args.join(",")
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
          }];
          setDisplayFields(newDisplayFields);
          setIsLoading(false);
        })
        .catch(err => {
          setAlertMsg(`Problems while retrieving registered models. Error message: ${getResponseError(err)}.`);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [server, namespace, refreshModels, setAlertMsg]);

  const updateNamespace = e => {
    if (e.target.dataset.ns) {
      setNamespace({
        name: e.target.dataset.ns,
        permission: parseInt(e.target.dataset.permission, 10)
      })
    }
  }
  const openAddNsModal = () => {
    setShowNsModal(true);
  }
  const openRemoveNsModal = () => {
    setShowRemoveNsModal(true);
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
                    onClick={openAddNsModal}
                  >
                    Add Namespace
                    <Folder width="12px" className="ml-2" />
                  </button>
                  {(namespace && namespace.name) &&
                    <Link to={`/quotas/${namespace.name}`}>
                      <button type="button" className="btn btn-sm btn-outline-primary">
                        Edit quota
                    <Save width="12px" className="ml-2" />
                      </button>
                    </Link>}
                </>
              }
              {(namespace.permission && 2) === 2 &&
                <Link to={`/models/${namespace.name}`}>
                  <button type="button" className="btn btn-sm btn-outline-primary">
                    Add Model
                    <Send width="12px" className="ml-2" />
                  </button>
                </Link>
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
                      onClick={openRemoveNsModal}
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
          <div className="tab-content">
            <div className="tab-pane active">
              <Table
                data={models}
                noDataMsg="No Model Found"
                isLoading={isLoading}
                displayFields={displayFields}
                idFieldName="id"
                sortedAsc={true}
                sortedCol="name"
              />
            </div>
          </div>
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
    </>
  );
};

export default Models;
