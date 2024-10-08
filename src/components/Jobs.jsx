import React, { useEffect, useContext, useState } from "react";
import { RefreshCw, Send, Layers, ToggleLeft, ToggleRight } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Table from "./Table";
import TimeDisplay from "./TimeDisplay";
import { getResponseError } from "./util";
import JobActionsButtonGroup from "./JobActionsButtonGroup";
import { Tab, Tabs } from "react-bootstrap";
import { UserSettingsContext } from "./UserSettingsContext";
import { UserLink } from "./UserLink";

const Jobs = () => {
  const location = useLocation();
  const [statusCodes, setStatusCodes] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [tabSelected, setTabSelected] = useState(location.pathname === "/hc" ? "hc" : "jobs");
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPageJobs, setCurrentPageJobs] = useState(1);
  const [sortedColJobs, setSortedColJobs] = useState("submitted_at");
  const [sortAscJobs, setSortAscJobs] = useState(false);
  const [userSettings,] = useContext(UserSettingsContext)
  const [rowsPerPage, setRowsPerPage] = useState(userSettings.tablePageLength);
  const [rowsPerPageHc, setRowsPerPageHc] = useState(userSettings.tablePageLength);
  const [jobData, setJobData] = useState([]);
  const [totalHcJobs, setTotalHcJobs] = useState(0);
  const [currentPageHcJobs, setCurrentPageHcJobs] = useState(1);
  const [sortedColHcJobs, setSortedColHcJobs] = useState("submitted_at");
  const [sortAscHcJobs, setSortAscHcJobs] = useState(false);
  const [hcJobData, setHcJobData] = useState([]);
  const [filterActive, setFilterActive] = useState(false);
  const [resetPageNumber, setResetPageNumber] = useState(false);
  const [{ jwt, server, roles }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);

  const isInviter = roles && roles.find(role => ["admin", "inviter"].includes(role)) !== undefined;

  const displayFieldsDefault = [
    {
      field: "user",
      column: "Username",
      sorter: "alphabetical-object",
      displayer: user => user.deleted ?
        <span className="badge rounded-pill bg-secondary ms-1">deleted</span> :
        <UserLink user={user.username} />
    },
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
      field: "tag",
      column: "Tag",
      displayer: e => <div className="table-cell-overflow">{e}</div>
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
  const [displayFields, setDisplayFields] = useState(displayFieldsDefault);

  const [displayFieldKeys,] = useState(displayFields.map(e => e.field));

  const statusCodeReducer = (accumulator, currentValue) => {
    accumulator[currentValue.status_code] = currentValue.description;
    return accumulator;
  };

  //init the list
  useEffect(() => {
    const fetchJobs = async () => {
      let jReq
      try {
        jReq = await axios.get(server + `/jobs/`, {
          params: {
            everyone: true,
            per_page: rowsPerPage,
            page: currentPageJobs,
            order_by: sortedColJobs,
            order_asc: sortAscJobs,
            show_only_active: filterActive
          },
          headers: { "X-Fields": displayFieldKeys.join(",") }
        })
      } catch (err) {
        setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`)
        setIsLoading(false)
        return
      }
      setTotalJobs(jReq.data.count);
      setJobData(jReq.data.results);
      setIsLoading(false);
    }

    const fetchHCJobs = async () => {
      let jHCReq
      try {
        jHCReq = await axios.get(server + `/hypercube/`, {
          params: {
            everyone: true,
            per_page: rowsPerPageHc,
            page: currentPageHcJobs,
            order_by: sortedColHcJobs,
            order_asc: sortAscHcJobs,
            show_only_active: filterActive
          },
          headers: { "X-Fields": displayFieldKeys.join(",") }
        })
      } catch (err) {
        setAlertMsg(`Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`)
        setIsLoading(false)
        return
      }
      setTotalHcJobs(jHCReq.data.count);
      setHcJobData(jHCReq.data.results);
      setIsLoading(false);
    }
    setIsLoading(true);
    if (tabSelected === "jobs") {
      fetchJobs()
    } else {
      fetchHCJobs()
    }
  }, [jwt, server, isInviter, filterActive, refresh, setAlertMsg,
    currentPageJobs, currentPageHcJobs, sortedColJobs, sortedColHcJobs, sortAscJobs,
    sortAscHcJobs, rowsPerPage, rowsPerPageHc, tabSelected, displayFieldKeys]);

  //fetch status codes
  useEffect(() => {
    const fetchStatusCode = async () => {
      let scReq
      try {
        scReq = await axios.get(server + `/jobs/status-codes`)
      } catch (err) {
        setAlertMsg(`Problems fetching status code map. Error message: ${getResponseError(err)}`)
        return
      }
      const newStatusCodes = scReq.data.reduce(statusCodeReducer, {});
      setStatusCodes(newStatusCodes);
      const newDisplayFields = displayFields.map(e => ({ ...e }));
      newDisplayFields.find(e => e.field === "status").displayer = e => (
        <p className="text-info">{newStatusCodes[e]}</p>
      );
      setDisplayFields(newDisplayFields);
    }
    // Only fetch status codes if not already fetched
    if (statusCodes.length === 0) {
      fetchStatusCode()
    }
  }, [server, displayFields, statusCodes, setAlertMsg]);

  return (
    <div>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Jobs</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            <Link to="/new-job">
              <button type="button" className="btn btn-sm btn-outline-primary h-100">
                New Job
                <Send width="12px" className="ms-2" />
              </button>
            </Link>
            <Link to="/new-hc-job">
              <button type="button" className="btn btn-sm btn-outline-primary h-100">
                New Hypercube Job
                <Layers width="12px" className="ms-2" />
              </button>
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setResetPageNumber(true);
                setCurrentPageJobs(1);
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
              <RefreshCw width="12px" className="ms-2" />
            </button>
          </div>
        </div>
      </div>
      <Tabs
        activeKey={tabSelected}
        onSelect={(k) => {
          navigate(`/${k}`)
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
            rowsPerPage={rowsPerPage}
            resetPageNumber={resetPageNumber}
            onChange={(currentPage, sortedCol, sortAsc, rowsPerPage) => {
              if (resetPageNumber === true) {
                setResetPageNumber(false);
                if (currentPage !== 0) {
                  // will refresh again
                  return;
                }
              }
              setCurrentPageJobs(currentPage + 1)
              setSortedColJobs(sortedCol)
              setSortAscJobs(sortAsc)
              setRowsPerPage(rowsPerPage)
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
            rowsPerPage={rowsPerPageHc}
            resetPageNumber={resetPageNumber}
            onChange={(currentPage, sortedCol, sortAsc, rowsPerPage) => {
              if (resetPageNumber === true) {
                setResetPageNumber(false);
                if (currentPage !== 0) {
                  // will refresh again
                  return;
                }
              }
              setCurrentPageHcJobs(currentPage + 1)
              setSortedColHcJobs(sortedCol)
              setSortAscHcJobs(sortAsc)
              setRowsPerPageHc(rowsPerPage)
            }}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default Jobs;
