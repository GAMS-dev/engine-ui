import React, { useEffect, useContext, useState } from "react";
import { RefreshCw, Send, Layers, ToggleLeft, ToggleRight } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { Link, useHistory } from "react-router-dom";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import { getResponseError } from "./util";
import JobActionsButtonGroup from "./JobActionsButtonGroup";
import { Tab, Tabs } from "react-bootstrap";

const Jobs = () => {
  const [statusCodes, setStatusCodes] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const history = useHistory();
  const [tabSelected, setTabSelected] = useState(history.location.pathname === "/hc" ? "hc" : "jobs");
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPageJobs, setCurrentPageJobs] = useState(1);
  const [sortedColJobs, setSortedColJobs] = useState("submitted_at");
  const [sortAscJobs, setSortAscJobs] = useState(false);
  const [jobData, setJobData] = useState([]);
  const [totalHcJobs, setTotalHcJobs] = useState(0);
  const [currentPageHcJobs, setCurrentPageHcJobs] = useState(1);
  const [sortedColHcJobs, setSortedColHcJobs] = useState("submitted_at");
  const [sortAscHcJobs, setSortAscHcJobs] = useState(false);
  const [hcJobData, setHcJobData] = useState([]);
  const [filterActive, setFilterActive] = useState(false);
  const [{ jwt, server, roles }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);

  const isInviter = roles && roles.find(role => ["admin", "inviter"].includes(role)) !== undefined;

  const displayFieldsDefault = [
    {
      field: "model",
      column: "Model",
      sorter: "alphabetical",
      displayer: String
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
      displayer: String
    },
    {
      field: "token,status",
      column: "Actions",
      displayer: (e, status) =>
        <JobActionsButtonGroup
          token={tabSelected === "hc" ? `hc:${e}` : e}
          status={status}
          server={server}
          setRefresh={setRefresh} />
    }
  ];
  const [displayFields, setDisplayFields] = useState(isInviter ?
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

  //init the list
  useEffect(() => {
    setIsLoading(true);
    if (tabSelected === "jobs") {
      axios
        .get(server + `/jobs/`, {
          params: {
            everyone: true,
            per_page: 10,
            page: currentPageJobs,
            order_by: sortedColJobs,
            order_asc: sortAscJobs,
            show_only_active: filterActive
          },
          headers: { "X-Fields": displayFields.map(e => e.field).join(", ") }
        })
        .then(res => {
          setTotalJobs(res.data.count);
          setJobData(res.data.results);
          setIsLoading(false);
        })
        .catch(err => {
          setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`);
          setIsLoading(false);
        });
    } else {
      axios
        .get(server + `/hypercube/`, {
          params: {
            everyone: true,
            per_page: 10,
            page: currentPageHcJobs,
            order_by: sortedColHcJobs,
            order_asc: sortAscHcJobs,
            show_only_active: filterActive
          },
          headers: { "X-Fields": displayFields.map(e => e.field).join(", ") }
        })
        .then(resHc => {
          setTotalHcJobs(resHc.data.count);
          setHcJobData(resHc.data.results);
          setIsLoading(false);
        })
        .catch(err => {
          setAlertMsg(`Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`);
          setIsLoading(false);
        });
    }
  }, [jwt, server, isInviter, filterActive, refresh, displayFields, setAlertMsg,
    currentPageJobs, currentPageHcJobs, sortedColJobs, sortedColHcJobs, sortAscJobs,
    sortAscHcJobs, tabSelected]);

  //fetch status codes
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
          setAlertMsg(`Problems fetching status code map. Error message: ${getResponseError(err)}`);
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
              <button type="button" className="btn btn-sm btn-outline-primary h-100">
                New Job
                <Send width="12px" className="ml-2" />
              </button>
            </Link>
            <Link to="/new-hc-job">
              <button type="button" className="btn btn-sm btn-outline-primary h-100">
                New Hypercube Job
                <Layers width="12px" className="ml-2" />
              </button>
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setFilterActive(currFilterActive => !currFilterActive)
              }}
            >
              {filterActive ?
                <ToggleRight size={18} style={{ marginTop: "2px" }} />
                :
                <ToggleLeft size={18} style={{ marginTop: "2px" }} />
              }
              &nbsp;
              <span className="flex-grow-1">
                {filterActive
                  ? "Show All"
                  : "Show Active"}
              </span>
            </button>
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
      <Tabs
        activeKey={tabSelected}
        onSelect={(k) => {
          history.push(`/${k}`)
          setTabSelected(k)
        }}>
        <Tab eventKey="jobs" title="Jobs">
          <Table
            data={jobData}
            noDataMsg="No Job Found"
            isLoading={isLoading}
            displayFields={displayFields}
            idFieldName="token"
            sortedCol={sortedColJobs}
            total={totalJobs}
            sortedAsc={sortAscJobs}
            onChange={(currentPage, sortedCol, sortAsc) => {
              setCurrentPageJobs(currentPage + 1)
              setSortedColJobs(sortedCol)
              setSortAscJobs(sortAsc)
            }}
          />
        </Tab>
        <Tab eventKey="hc" title="Hypercube Jobs">
          <Table
            data={hcJobData}
            noDataMsg="No Hypercube Job Found"
            isLoading={isLoading}
            displayFields={displayFields}
            idFieldName="token"
            sortedCol={sortedColHcJobs}
            total={totalHcJobs}
            sortedAsc={sortAscHcJobs}
            onChange={(currentPage, sortedCol, sortAsc) => {
              setCurrentPageHcJobs(currentPage + 1)
              setSortedColHcJobs(sortedCol)
              setSortAscHcJobs(sortAsc)
            }}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default Jobs;
