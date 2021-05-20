import React, { useEffect, useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import JobReqInfoTable from "./JobReqInfoTable";
import JobRespInfoTable from "./JobRespInfoTable";
import { getResponseError } from "./util";
import TextEntryView from "./TextEntryView";
import { ServerInfoContext } from "../ServerInfoContext";

const Job = () => {
  const [job, setJob] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [isHcJob, setIsHcJob] = useState(false);
  const [statusCodes, setStatusCodes] = useState([]);
  const { token } = useParams();
  const [{ jwt, server }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const [serverInfo,] = useContext(ServerInfoContext);

  useEffect(() => {
    const fields = [
      "arguments",
      "is_data_provided",
      "is_temporary_model",
      "model",
      "namespace",
      "process_status",
      "status",
      "stdout_filename",
      "stream_entries",
      "dep_tokens",
      "submitted_at",
      "result_exists",
      "text_entries{entry_name, entry_size}",
      "token"
    ];
    if (serverInfo.in_kubernetes === true) {
      fields.push("labels");
    }
    let jobDataPromise;
    if (token.startsWith("hc:")) {
      setIsHcJob(true);
      jobDataPromise = axios
        .get(`${server}/hypercube/`, {
          params: {
            hypercube_token: token.substring(3)
          }
        })
        .then(res => {
          if (!Array.isArray(res.data.results) || res.data.results.length === 0) {
            setAlertMsg("Problems fetching Hypercube job information. Please try again later.");
            return;
          }
          return res.data.results[0];
        })
        .catch(err => {
          setAlertMsg(`Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`);
        });
    } else {
      setIsHcJob(false);
      jobDataPromise = axios
        .get(`${server}/jobs/${encodeURIComponent(token)}`, {
          headers: { "X-Fields": fields.join(", ") }
        })
        .then(res => {
          return res.data;
        })
        .catch(err => {
          setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`);
        });
    }
    jobDataPromise
      .then(jobData => {
        if (jobData) {
          if (jobData.is_temporary_model) {
            setJob(jobData);
          } else {
            axios.get(`${server}/namespaces/${encodeURIComponent(jobData.namespace)}`, {
              params: {
                model: jobData.model
              },
              headers: { "X-Fields": "arguments" }
            })
              .then(res => {
                if (res.data.length === 1) {
                  const newJobData = jobData;
                  newJobData.includes_model_args = true;
                  newJobData.arguments.push(...res.data[0].arguments);
                  setJob(newJobData);
                } else {
                  setJob(jobData);
                }
              })
              .catch(err => {
                if (err.response.status !== 403) {
                  setAlertMsg(`Problems fetching model information. Error message: ${getResponseError(err)}`);
                }
              });
          }
        }
      });
  }, [jwt, server, token, setAlertMsg, refresh, serverInfo]);

  useEffect(() => {
    axios
      .get(`${server}/jobs/status-codes`)
      .then(res => {
        const newStatusCodes = {};
        for (let i = 0; i < res.data.length; i++) {
          const element = res.data[i];
          newStatusCodes[element.status_code] = element.description;
        }
        setStatusCodes(newStatusCodes);
      })
      .catch(err => {
        setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`);
      });
  }, [server, setAlertMsg]);

  const setTextEntries = textEntries => {
    const newJob = { ...job };
    newJob.text_entries = textEntries;
    setJob(newJob);
  };
  return (
    <React.Fragment>
      {job ? (
        <div className="mt-4">
          <div className="row">
            <div className={`col-md-6 ${isHcJob ? "" : "col-xl-4"}`}>
              <JobReqInfoTable
                job={job}
                isHcJob={isHcJob}
                inKubernetes={serverInfo.in_kubernetes === true} />
            </div>
            <div className={`col-md-6 ${isHcJob ? "" : "col-xl-4"}`}>
              <JobRespInfoTable
                job={job}
                statusCodes={statusCodes}
                isHcJob={isHcJob}
                setRefreshJob={setRefresh}
                server={server}
              />
            </div>
            {job.text_entries && job.text_entries.length > 0 && job.status >= 10 &&
              <div className="col-md-12 col-xl-4">
                <TextEntryView
                  textEntries={job.text_entries}
                  setTextEntries={setTextEntries}
                  server={server}
                />
              </div>}
          </div>
        </div>
      ) : null}
    </React.Fragment>
  );
};

export default Job;
