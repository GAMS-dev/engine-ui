import React, { useEffect, useContext, useState } from "react";
import { RefreshCw, Send, Layers, ArrowDown, ArrowUp, ToggleLeft, ToggleRight } from "react-feather";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import { Link } from "react-router-dom";
import axios from "axios";
import TimeDisplay from "./TimeDisplay";
import { getResponseError } from "./util";
import JobActionsButtonGroup from "./JobActionsButtonGroup";
import ClipLoader from "react-spinners/ClipLoader";
import Pagination from 'react-bootstrap/Pagination';

const Jobs = () => {
  const [statusCodes, setStatusCodes] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [jobPageInformation, setJobPageInformation] = useState(null);
  const [hypercubePageInformation, setHypercubePageInformation] = useState(null);
  const [view, setView] = useState(null);
  const [filterActive, setFilterActive] = useState(false);
  const [{ jwt, server, roles }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false);
  const [sortedCol, setSortedCol] = useState("submitted_at");
  const [needMore, setNeedMore] = useState(null);

  const isInviter = roles && roles.find(role => ["admin", "inviter"].includes(role)) !== undefined;

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
      displayer: String
    },
    {
      field: "token,status",
      column: "Actions",
      displayer: (e, status) =>
        <JobActionsButtonGroup
          token={e}
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

  const noRows = (jobPageInformation ? jobPageInformation.total : 0) + (hypercubePageInformation ? hypercubePageInformation.total : 0);
  const rowsPerPage = 10;
  const noPages = Math.ceil(noRows / rowsPerPage);


  const gotoFirstPage = () => {
    setCurrentPage(1);
  }
  const gotoLastPage = () => {
    setCurrentPage(noPages);
  }
  const gotoNextPage = () => {
    setCurrentPage(currentPage + 1);
  }
  const gotoPreviousPage = () => {
    setCurrentPage(currentPage - 1);
  }
  const updateCurrentPage = e => {
    const newPage = parseInt(e.target.text, 10);
    if (!isNaN(newPage)) {
      setCurrentPage(newPage);
    }
  }
  const statusCodeReducer = (accumulator, currentValue) => {
    accumulator[currentValue.status_code] = currentValue.description;
    return accumulator;
  };

  const sortCol = e => {
    if (!e.target.dataset.field)
      return;
    const field = e.target.dataset.field.split(",")[0];
    const asc = (field === sortedCol && sortAsc) ? 1 : -1;
    setSortAsc(asc === -1);
    setSortedCol(field);
  }

  //init the list
  useEffect(() => {
    let requestsFinished = 0;
    setIsLoading(true);
    axios
      .get(server + `/jobs/`, {
        params: {
          everyone: isInviter,
          per_page: rowsPerPage * 10,
          order_by: sortedCol,
          order_asc: sortAsc,
          show_only_active: filterActive
        },
        headers: { "X-Fields": displayFields.map(e => e.field).join(", ") }
      })
      .then(res => {
        setJobPageInformation({
          "total": res.data.count,
          "hasNext": res.data.next !== null,
          "hasPrevious": res.data.previous !== null,
          "currentPage": 1,
          "rowsPerPage": rowsPerPage * 10,
          "results": res.data.results
        });
        if (requestsFinished > 0) {
          setIsLoading(false);
        } else {
          requestsFinished++;
        }
      })
      .catch(err => {
        setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`);
        setIsLoading(false);
      });

    axios
      .get(server + `/hypercube/`, {
        params: {
          everyone: isInviter,
          per_page: rowsPerPage * 10,
          order_by: sortedCol,
          order_asc: sortAsc,
          show_only_active: filterActive
        },
        headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", finished, status, job_count" }
      })
      .then(resHc => {
        setHypercubePageInformation({
          "total": resHc.data.count,
          "hasNext": resHc.data.next !== null,
          "hasPrevious": resHc.data.previous !== null,
          "currentPage": 1,
          "rowsPerPage": rowsPerPage * 10,
          "results": resHc.data.results
        });
        if (requestsFinished > 0) {
          setIsLoading(false);
        } else {
          requestsFinished++;
        }
      })
      .catch(err => {
        setAlertMsg(`Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`);
        setIsLoading(false);
      });
  }, [jwt, server, isInviter, filterActive, refresh, displayFields, setAlertMsg, sortedCol, sortAsc]);

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

  useEffect(() => {
    if (jobPageInformation !== null && hypercubePageInformation !== null) {
      const normalizeHypercube = hcube => {
        const newHc = hcube;
        if (!newHc.token.startsWith('hc:')) {
          newHc.token = `hc:${newHc.token}`;
        }
        return newHc;
      }

      const comparators = {
        "user": (a, b, eq) => { return eq !== 1 ? (a['user']['username'] > b['user']['username']) : (a['user']['username'] === b['user']['username']) },
        "model": (a, b, eq) => { return eq !== 1 ? (a['model'] > b['model']) : (a['model'] === b['model']) },
        "namespace": (a, b, eq) => { return eq !== 1 ? (a['namespace'] > b['namespace']) : (a['namespace'] === b['namespace']) },
        "submitted_at": (a, b, eq) => { return eq !== 1 ? (a['submitted_at'] > b['submitted_at']) : (a['submitted_at'] === b['submitted_at']) }
      }

      const lenJobPage = jobPageInformation.results.length;
      const lenHypercubePage = hypercubePageInformation.results.length;
      let i = 0;
      let j = 0;
      const newView = [];

      while (i < lenJobPage && j < lenHypercubePage) {
        if (comparators[sortedCol](jobPageInformation.results[i], hypercubePageInformation.results[j], 1) && sortedCol !== 'submitted_at') {
          if (jobPageInformation.results[i]['submitted_at'] > hypercubePageInformation.results[j]['submitted_at']) {
            newView.push(jobPageInformation.results[i]);
            i++;
          } else {
            newView.push(normalizeHypercube(hypercubePageInformation.results[j]));
            j++;
          }
        }
        else if (comparators[sortedCol](jobPageInformation.results[i], hypercubePageInformation.results[j], 0) === sortAsc) {
          newView.push(normalizeHypercube(hypercubePageInformation.results[j]));
          j++;
        }
        else {
          newView.push(jobPageInformation.results[i]);
          i++;
        }
      }

      if (i === lenJobPage) {
        if (!jobPageInformation.hasNext) {
          for (let index = j; index < lenHypercubePage; index++) {
            newView.push(normalizeHypercube(hypercubePageInformation.results[index]));
          }
          if (hypercubePageInformation.hasNext)
            setNeedMore(hypercubePageInformation.hasNext ? 'H' : null);
        } else {
          setNeedMore('J');
        }
      } else {
        if (!hypercubePageInformation.hasNext) {
          for (let index = i; index < lenJobPage; index++) {
            newView.push(jobPageInformation.results[index]);
          }
          setNeedMore(jobPageInformation.hasNext ? 'J' : null);
        } else {
          setNeedMore('H');
        }
      }
      setView(newView);
    }
  }, [jobPageInformation, hypercubePageInformation, sortedCol, sortAsc]);

  useEffect(() => {
    const numberOfRows = (jobPageInformation ? jobPageInformation.total : 0) + (hypercubePageInformation ? hypercubePageInformation.total : 0);
    const numberOfPages = Math.ceil(numberOfRows / rowsPerPage);

    if (needMore !== null && view !== null && (
      (currentPage !== numberOfPages && view.length < currentPage * rowsPerPage) ||
      (currentPage === numberOfPages && view.length < numberOfRows))
    ) {
      const valueOfNeedMore = needMore;
      setNeedMore(null);
      if (valueOfNeedMore === 'J') {
        axios
          .get(server + `/jobs/`, {
            params: {
              everyone: isInviter,
              per_page: currentPage * rowsPerPage,
              order_by: sortedCol,
              order_asc: sortAsc,
              page: 1,
              show_only_active: filterActive
            },
            headers: { "X-Fields": displayFields.map(e => e.field).join(", ") }
          })
          .then(res => {
            const newJobInformation = {
              "total": res.data.count,
              "hasNext": res.data.next !== null,
              "hasPrevious": res.data.previous !== null,
              "currentPage": 1,
              "rowsPerPage": currentPage * rowsPerPage,
              "results": res.data.results
            };
            setJobPageInformation(newJobInformation);
          })
          .catch(err => {
            setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`);
          });
      } else if (needMore === 'H') {
        axios
          .get(server + `/hypercube/`, {
            params: {
              everyone: isInviter,
              per_page: currentPage * rowsPerPage,
              order_by: sortedCol,
              order_asc: sortAsc,
              page: 1,
              show_only_active: filterActive
            },
            headers: { "X-Fields": displayFields.map(e => e.field).join(", ") + ", finished, status, job_count" }
          })
          .then(resHc => {
            const newHcInformation = {
              "total": resHc.data.count,
              "hasNext": resHc.data.next !== null,
              "hasPrevious": resHc.data.previous !== null,
              "currentPage": 1,
              "rowsPerPage": currentPage * rowsPerPage,
              "results": resHc.data.results
            }
            setHypercubePageInformation(newHcInformation);
          })
          .catch(err => {
            setAlertMsg(`Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`);
          });
      }
    }
  }, [currentPage, view, hypercubePageInformation, jobPageInformation,
    needMore, filterActive, displayFields, isInviter, server, setAlertMsg, sortAsc, sortedCol])

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
      <div className="table-responsive">
        <table className="table summary-table table-striped">
          <thead className="thead-dark">
            <tr>
              {displayFields.map(e => (
                <th scope="col" key={e.field}
                  data-field={e.field}
                  data-sorter={e.sorter}
                  style={e.sorter == null ? {} : { cursor: "pointer" }}
                  onClick={e.sorter == null ? undefined : sortCol}>
                  {e.column}
                  {(e.field.split(",")[0] === sortedCol) && (sortAsc ?
                    <ArrowUp width="12px" /> :
                    <ArrowDown width="12px" />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!isLoading && view && view.length > 0 && view.length >= (currentPage - 1) * rowsPerPage ?
              view.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map(sub => {
                return <tr key={sub["token"]}>
                  {displayFields.map(e => (
                    <td key={sub["token"] + "_" + e.field}>
                      {e.displayer(...e.field.split(",").map(subEl => sub[subEl]))}
                    </td>
                  ))}
                </tr>
              }) :
              <tr>
                <td colSpan={displayFields.length}>{(!isLoading && view && view.length === 0) ? "No Job Found" : <ClipLoader />}</td>
              </tr>
            }
          </tbody>
        </table>
        {noRows > rowsPerPage &&
          <><small>{((jobPageInformation === null ? 0 : jobPageInformation.total) + (hypercubePageInformation === null ? 0 : hypercubePageInformation.total)).toLocaleString()} items</small>
            <Pagination>
              <Pagination.First disabled={currentPage === 1} onClick={gotoFirstPage} />
              <Pagination.Prev disabled={currentPage === 1} onClick={gotoPreviousPage} />
              {[...Array(noPages).keys()].map(i => {
                const pageDistance = (i === 0 || i === noPages - 1) ? 0 :
                  Math.abs(currentPage - 1 - i);
                if (pageDistance === 2) {
                  return <Pagination.Ellipsis key={'pe_' + i} disabled={true} />
                } else if (pageDistance > 1) {
                  return undefined
                }
                return <Pagination.Item key={'p_' + i} active={currentPage === i + 1} onClick={updateCurrentPage}>
                  {++i}
                </Pagination.Item>
              })}
              <Pagination.Next disabled={currentPage === noPages} onClick={gotoNextPage} />
              <Pagination.Last disabled={currentPage === noPages} onClick={gotoLastPage} />
            </Pagination></>}
      </div>
    </div>
  );
};

export default Jobs;
