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
import ClipLoader from "react-spinners/ClipLoader";

const Job = () => {
  const [job, setJob] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHcJob, setIsHcJob] = useState(false);
  const [statusCodes, setStatusCodes] = useState([]);
  const { token } = useParams();
  const [{ jwt, server }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const [serverInfo,] = useContext(ServerInfoContext);
  const [invalidUserRequest, setInvalidUserRequest] = useState(false);
  const [invalidUserMessage, setInvalidUserMessage] = useState('');

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    if (refresh !== false) {
      setIsLoading(true);
    }
    const fields = [
      "arguments",
      "is_data_provided",
      "is_temporary_model",
      "model",
      "namespace",
      "access_groups",
      "process_status",
      "status",
      "stdout_filename",
      "stream_entries",
      "dep_tokens",
      "submitted_at",
      "result_exists",
      "text_entries{entry_name}",
      "token",
      "tag",
      "queue_position"
    ];
    if (serverInfo.in_kubernetes === true) {
      fields.push("labels{*}");
    }
    const fetchJobData = async () => {
      let jobData;
      if (token.startsWith("hc:")) {
        setIsHcJob(true);
        try {
          jobData = await axios
            .get(`${server}/hypercube/`, {
              headers: { "X-Fields": "*, labels{*}" },
              params: {
                hypercube_token: token.substring(3)
              },
              cancelToken: source.token
            })
          if (jobData.data.results.length === 0) {
            setAlertMsg("Problems fetching Hypercube job information. Please try again later.")
            setIsLoading(false)
            return
          }
          jobData = jobData.data.results[0]
        } catch (err) {
          if (!axios.isCancel(err)) {
            if (err.status === 404) {
              setInvalidUserRequest(true)
              console.log(`Job ${encodeURIComponent(token)} does not exist.`)
              setInvalidUserMessage(`Job ${encodeURIComponent(token)} does not exist.`)
            }
            setAlertMsg(`Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`)
            setIsLoading(false)
          }
          return
        }
      } else {
        setIsHcJob(false)
        try {
          jobData = await axios
            .get(`${server}/jobs/${encodeURIComponent(token)}`, {
              headers: { "X-Fields": fields.join(", ") + ',user' },
              cancelToken: source.token
            })
          jobData = jobData.data
        } catch (err) {
          if (!axios.isCancel(err)) {
            if (err.status === 404) {
              setInvalidUserRequest(true)
              setInvalidUserMessage(`Job ${encodeURIComponent(token)} does not exist.`)
            }
            setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`)
            setIsLoading(false)
          }
          return
        }
      }
      if (jobData.is_temporary_model) {
        setJob(jobData)
        setIsLoading(false)
        return
      }
      try {
        const modelInfo = await axios.get(`${server}/namespaces/${encodeURIComponent(jobData.namespace)}`, {
          params: {
            model: jobData.model
          },
          headers: { "X-Fields": "upload_date" },
          cancelToken: source.token
        })
        if (modelInfo.data.length === 1) {
          const newJobData = jobData;
          if (Date.parse(newJobData.submitted_at) > Date.parse(modelInfo.data[0].upload_date)) {
            // TODO: we can get false positives here as the submission time is not the time the
            // model is extracted. We should consider using the time the job was actually
            // started (using the /usage endpoint)
            newJobData.model_consistent = true
          }
          setJob(newJobData)
        } else {
          setJob(jobData)
        }
      } catch (err) {
        if (!axios.isCancel(err) && err?.response?.status !== 403) {
          setAlertMsg(`Problems fetching model information. Error message: ${getResponseError(err)}`)
        }
        setJob(jobData)
      }
      setIsLoading(false)
    }
    fetchJobData()
    return () => {
      source.cancel('Fetching job info canceled due to component being unmounted.');
    }
  }, [jwt, server, token, setAlertMsg, refresh, serverInfo]);

  useEffect(() => {
    const fetchJobInfo = async () => {
      let jReq
      try {
        jReq = await axios.get(`${server}/jobs/status-codes`)
      } catch (err) {
        setAlertMsg(`Problems fetching job information. Error message: ${getResponseError(err)}`)
        return
      }
      const newStatusCodes = {};
      for (let i = 0; i < jReq.data.length; i++) {
        const element = jReq.data[i];
        newStatusCodes[element.status_code] = element.description;
      }
      setStatusCodes(newStatusCodes);
    }
    fetchJobInfo()
  }, [server, setAlertMsg]);

  return (
    <>
      {isLoading ? <ClipLoader /> :
        invalidUserRequest ?
          <div className="alert alert-danger mt-3">
            <p><strong>{invalidUserMessage}</strong></p>
          </div> :
          <div className="mt-4">
            <div className="row">
              <div className={`col-md-6 ${isHcJob ? "" : "col-xl-4"}`}>
                <JobReqInfoTable
                  job={job}
                  isHcJob={isHcJob}
                  inKubernetes={serverInfo.in_kubernetes === true}
                  setRefreshJob={setRefresh} />
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
                    textEntries={job.text_entries && job.text_entries.length > 0 ?
                      job.text_entries.sort((a, b) => a.entry_name.localeCompare(b.entry_name)) : null}
                    server={server}
                  />
                </div>}
            </div>
          </div>}
    </>
  );
};

export default Job;
