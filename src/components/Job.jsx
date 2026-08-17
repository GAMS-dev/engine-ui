import { useEffect, useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import AuthContext from '../contexts/AuthContext';
import AlertContext from '../contexts/AlertContext';
import axios from 'axios';
import JobReqInfoTable from './JobReqInfoTable';
import JobRespInfoTable from './JobRespInfoTable';
import { getResponseError } from '../util/util';
import TextEntryView from './TextEntryView';
import ServerInfoContext from '../contexts/ServerInfoContext';
import ClipLoader from './ThemedClipLoader';

const Job = () => {
  const [job, setJob] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHcJob, setIsHcJob] = useState(false);
  const [statusCodes, setStatusCodes] = useState([]);
  const { token } = useParams();
  const [{ jwt, server }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();
    if (refresh !== false) {
      setIsLoading(true);
    }
    const fields = [
      'arguments',
      'is_data_provided',
      'is_temporary_model',
      'model',
      'namespace',
      'access_groups',
      'process_status',
      'status',
      'stdout_filename',
      'stream_entries',
      'dep_tokens',
      'submitted_at',
      'result_exists',
      'text_entries{entry_name}',
      'token',
      'tag',
      'queue_position',
      'priority',
    ];
    if (serverInfo.in_kubernetes === true) {
      fields.push('labels{*}');
    }
    const fetchJobData = async () => {
      let jobData;
      if (token.startsWith('hc:')) {
        setIsHcJob(true);
        try {
          jobData = await axios.get(`${server}/hypercube/`, {
            headers: { 'X-Fields': '*, labels{*}' },
            params: {
              hypercube_token: token.substring(3),
            },
            cancelToken: source.token,
          });
          if (jobData.data.results.length === 0) {
            setErrorMessage(
              'Problems fetching Hypercube job information. Please try again later.',
            );
            setIsLoading(false);
            return;
          }
          jobData = jobData.data.results[0];
        } catch (err) {
          if (!axios.isCancel(err)) {
            setErrorMessage(
              `Problems fetching Hypercube job information. Error message: ${getResponseError(err)}`,
            );
            setIsLoading(false);
          }
          return;
        }
      } else {
        setIsHcJob(false);
        try {
          jobData = await axios.get(
            `${server}/jobs/${encodeURIComponent(token)}`,
            {
              headers: { 'X-Fields': fields.join(', ') + ',user' },
              cancelToken: source.token,
            },
          );
          jobData = jobData.data;
        } catch (err) {
          if (!axios.isCancel(err)) {
            setErrorMessage(
              `Problems fetching job information. Error message: ${getResponseError(err)}`,
            );
            setIsLoading(false);
          }
          return;
        }
      }
      if (jobData.is_temporary_model) {
        setJob(jobData);
        setIsLoading(false);
        return;
      }
      try {
        const modelInfo = await axios.get(
          `${server}/namespaces/${encodeURIComponent(jobData.namespace)}`,
          {
            params: {
              model: jobData.model,
            },
            headers: { 'X-Fields': 'upload_date' },
            cancelToken: source.token,
          },
        );
        if (modelInfo.data.length === 1) {
          // TODO: we can get false positives here as the submission time is not the time the
          // model is extracted. We should consider using the time the job was actually
          // started (using the /usage endpoint)
          const modelConsistent =
            Date.parse(jobData.submitted_at) >
            Date.parse(modelInfo.data[0].upload_date);
          setJob(
            modelConsistent ? { ...jobData, model_consistent: true } : jobData,
          );
        } else {
          setJob(jobData);
        }
      } catch (err) {
        if (!axios.isCancel(err) && err?.response?.status !== 403) {
          setAlertMsg(
            `Problems fetching model information. Error message: ${getResponseError(err)}`,
          );
        }
        setJob(jobData);
      }
      setIsLoading(false);
    };
    fetchJobData();
    return () => {
      source.cancel(
        'Fetching job info canceled due to component being unmounted.',
      );
    };
  }, [jwt, server, token, setAlertMsg, refresh, serverInfo]);

  useEffect(() => {
    const fetchJobInfo = async () => {
      let jReq;
      try {
        jReq = await axios.get(`${server}/jobs/status-codes`);
      } catch (err) {
        setAlertMsg(
          `Problems fetching job information. Error message: ${getResponseError(err)}`,
        );
        return;
      }
      const newStatusCodes = {};
      for (let i = 0; i < jReq.data.length; i++) {
        const element = jReq.data[i];
        newStatusCodes[element.status_code] = element.description;
      }
      setStatusCodes(newStatusCodes);
    };
    fetchJobInfo();
  }, [server, setAlertMsg]);

  const hasTextEntriesPanel =
    !isHcJob && job?.text_entries?.length > 0 && job?.status >= 10;

  const sortedTextEntries = useMemo(
    () =>
      hasTextEntriesPanel
        ? [...job.text_entries].sort((a, b) =>
            a.entry_name.localeCompare(b.entry_name),
          )
        : null,
    [hasTextEntriesPanel, job],
  );

  return (
    <>
      {isLoading ? (
        <ClipLoader />
      ) : errorMessage !== '' ? (
        <div className="alert alert-danger mt-3">
          <p>
            <strong>{errorMessage}</strong>
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <div className="row">
            <div
              className={`col-md-6 ${hasTextEntriesPanel ? 'col-xl-4' : ''}`}
            >
              <JobReqInfoTable
                job={job}
                isHcJob={isHcJob}
                inKubernetes={serverInfo.in_kubernetes === true}
                setRefreshJob={setRefresh}
              />
            </div>
            <div
              className={`col-md-6 ${hasTextEntriesPanel ? 'col-xl-4' : ''}`}
            >
              <JobRespInfoTable
                job={job}
                statusCodes={statusCodes}
                isHcJob={isHcJob}
                setRefreshJob={setRefresh}
                server={server}
              />
            </div>
            {hasTextEntriesPanel && (
              <div className="col-md-12 col-xl-4">
                <TextEntryView
                  textEntries={sortedTextEntries}
                  server={server}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Job;
