import React, { useEffect, useContext, useState } from "react";
import { RefreshCw, Send, Layers } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { Link } from "react-router-dom";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import moment from "moment";
import JobActionsButtonGroup from "./JobActionsButtonGroup";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [statusCodes, setStatusCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [{ jwt, server, roles }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const displayFieldsDefault = [
    {
      field: "model,token",
      column: "Model",
      sorter: "alphabetical",
      displayer: (model, token) => <>
        {model}{token.startsWith("hc:") &&
          <sup>
            <span className="badge badge-pill badge-primary ml-1">HC</span>
          </sup>}
      </>
    },
    {
      field: "namespace",
      column: "Namespace",
      sorter: "alphabetical",
      displayer: String
    },
    {
      field: "submitted_at",
      column: "Submitted",
      sorter: "datetime",
      displayer: e => <TimeDisplay time={e} />
    },
    {
      field: "status",
      column: "Status",
      sorter: "numerical",
      displayer: String
    },
    {
      field: "token,status",
      column: "Actions",
      displayer: (e, status) => <JobActionsButtonGroup token={e} status={status} server={server}
        setRefresh={setRefresh} />
    }
  ];
  const [displayFields, setDisplayFields] = useState(roles.find(role => role === "admin") !== undefined ?
    [{
      field: "user",
      column: "Username",
      sorter: "alphabetical-object",
      displayer: user => user.deleted ?
        <span className="badge badge-pill badge-secondary ml-1">deleted</span> : user.username
    }].concat(displayFieldsDefault) :
    displayFieldsDefault);

  const statusCodeReducer = (accumulator, currentValue) => {
    accumulator[currentValue.status_code] = currentValue.description;
    return accumulator;
  };

  useEffect(() => {
    setIsLoading(true);
    axios
      .get(server + `/jobs/`, {
        params: { everyone: roles.find(role => role === "admin") !== undefined },
        headers: { "X-Fields": displayFields.map(e => e.field).join(", ") }
      })
      .then(res => {
        axios
          .get(server + `/hypercube/`, {
            params: { everyone: roles.find(role => role === "admin") !== undefined },
            headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", finished, cancelled, job_count" }
          })
          .then(resHc => {
            setJobs(res.data.concat(resHc.data.map(hc => {
              const newHc = hc;
              newHc.token = `hc:${hc.token}`;
              newHc.status = hc.cancelled ? -3 : (hc.finished === hc.job_count ? 10 : (hc.finished > 0 ? 1 : 0));
              return newHc;
            })).sort((a, b) => moment.utc(b.submitted_at) -
              moment.utc(a.submitted_at)));
            setIsLoading(false);
          })
          .catch(err => {
            setAlertMsg(`Problems fetching Hypercube job information. Error message: ${err.message}`);
            setIsLoading(false);
          });
      })
      .catch(err => {
        setAlertMsg(`Problems fetching job information. Error message: ${err.message}`);
        setIsLoading(false);
      });
  }, [jwt, server, roles, refresh, displayFields, setAlertMsg]);

  useEffect(() => {
    // Only fetch status codes if not already fetched
    if (statusCodes.length === 0) {
      axios
        .get(server + `/jobs/status-codes`)
        .then(res => {
          const newStatusCodes = res.data.reduce(statusCodeReducer, {});
          setStatusCodes(newStatusCodes);
          const newDisplayFields = displayFields.map(e => ({ ...e }));
          newDisplayFields.find(e => e.field === "status").displayer = e => (
            <p className="text-info">{newStatusCodes[e]}</p>
          );
          setDisplayFields(newDisplayFields);
        })
        .catch(err => {
          setAlertMsg(`Problems fetching status code map. Error message: ${err.message}`);
        });
    }
  }, [server, displayFields, statusCodes, setAlertMsg]);

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Jobs</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group mr-2">
            <Link to="/new-job">
              <button type="button" className="btn btn-sm btn-outline-primary">
                New Job
                <Send width="12px" className="ml-2" />
              </button>
            </Link>
            <Link to="/new-hc-job">
              <button type="button" className="btn btn-sm btn-outline-primary">
                New Hypercube Job
                <Layers width="12px" className="ml-2" />
              </button>
            </Link>
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
      <Table
        data={jobs}
        noDataMsg="No Job Found"
        displayFields={displayFields}
        idFieldName="token"
        sortedAsc={false}
        isLoading={isLoading}
        sortedCol="submitted_at"
      />
    </div>
  );
};

export default Jobs;
