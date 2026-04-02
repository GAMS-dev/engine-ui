import axios from 'axios';
import { useContext, useEffect, useState, useRef } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { RefreshCw } from 'react-feather';
import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';
import AlertContext from '../contexts/AlertContext';
import AuthContext from '../contexts/AuthContext';
import ServerInfoContext from '../contexts/ServerInfoContext';
import UserSettingsContext from '../contexts/UserSettingsContext';
import { calcRemainingQuota, getResponseError } from '../util/util';

const Usage = () => {
  const { userToEditRoles } = useOutletContext();
  const { userToEdit } = useParams();
  const [data, setData] = useState([]);
  const [recursive, setRecursive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)),
  );
  const [endDate, setEndDate] = useState(new Date());
  const [, setAlertMsg] = useContext(AlertContext);
  const [{ server }] = useContext(AuthContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const [remainingQuota, setRemainingQuota] = useState(0);
  const [userSettings] = useContext(UserSettingsContext);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const quotaFormattingFn = userSettings.quotaFormattingFn;

  const location = useLocation();
  const navigate = useNavigate();

  const userToEditIsInviter =
    userToEditRoles.includes('admin') || userToEditRoles.includes('inviter');
  const abortControllerRef = useRef(null);

  const fetchData = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const requestParams = {
      recursive: userToEditIsInviter ? recursive : false,
      from_datetime: startDate,
      to_datetime: endDate,
    };
    const requestHeader = {
      'X-Fields':
        'job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}},pool_usage{*}',
    };

    try {
      if (serverInfo.is_saas && serverInfo.use_brokerv2) {
        setDownloadProgress(0);

        const endpoints = [
          { key: 'job_usage', url: `${server}/v2/usage/${userToEdit}/jobs` },
          {
            key: 'hypercube_job_usage',
            url: `${server}/v2/usage/${userToEdit}/hypercube`,
          },
          { key: 'pool_usage', url: `${server}/v2/usage/${userToEdit}/pools` },
        ];

        let currentOffsetJob = 0;
        let currentOffsetHcJob = 0;
        let currentOffsetPool = 0;

        const firstResponses = await Promise.all(
          endpoints.map((e) =>
            axios.get(e.url, {
              params: { ...requestParams, offset: 0 },
              headers: requestHeader,
              signal: controller.signal,
            }),
          ),
        );

        const metadata = firstResponses.map((res) => ({
          total: parseInt(res.headers['x-total']),
          perPage: parseInt(res.headers['x-per-page']),
        }));

        let finalData = {
          job_usage: [...firstResponses[0].data.items],
          hypercube_job_usage: [...firstResponses[1].data.items],
          pool_usage: [...firstResponses[2].data.items],
        };

        const getTotalCount = () =>
          metadata.reduce((sum, m) => sum + m.total, 0);
        const getCurrentCount = () =>
          finalData.job_usage.length +
          finalData.hypercube_job_usage.length +
          finalData.pool_usage.length;

        const totalToFetch = getTotalCount();
        setDownloadProgress(
          Math.min(Math.round((getCurrentCount() / totalToFetch) * 100), 100),
        );

        while (
          finalData.job_usage.length < metadata[0].total ||
          finalData.hypercube_job_usage.length < metadata[1].total ||
          finalData.pool_usage.length < metadata[2].total
        ) {
          currentOffsetJob += metadata[0].perPage;
          currentOffsetHcJob += metadata[1].perPage;
          currentOffsetPool += metadata[2].perPage;

          const pendingRequests = [];
          if (finalData.job_usage.length < metadata[0].total) {
            pendingRequests.push(
              axios
                .get(endpoints[0].url, {
                  params: { ...requestParams, offset: currentOffsetJob },
                  headers: requestHeader,
                  signal: controller.signal,
                })
                .then((r) => ({ key: 'job_usage', items: r.data.items })),
            );
          }
          if (finalData.hypercube_job_usage.length < metadata[1].total) {
            pendingRequests.push(
              axios
                .get(endpoints[1].url, {
                  params: { ...requestParams, offset: currentOffsetHcJob },
                  headers: requestHeader,
                  signal: controller.signal,
                })
                .then((r) => ({
                  key: 'hypercube_job_usage',
                  items: r.data.items,
                })),
            );
          }
          if (finalData.pool_usage.length < metadata[2].total) {
            pendingRequests.push(
              axios
                .get(endpoints[2].url, {
                  params: { ...requestParams, offset: currentOffsetPool },
                  headers: requestHeader,
                  signal: controller.signal,
                })
                .then((r) => ({ key: 'pool_usage', items: r.data.items })),
            );
          }

          const nextBatch = await Promise.all(pendingRequests);

          nextBatch.forEach((batch) => {
            finalData[batch.key] = [...finalData[batch.key], ...batch.items];
          });

          setDownloadProgress(
            Math.min(Math.round((getCurrentCount() / totalToFetch) * 100), 100),
          );
        }

        setData(finalData);
      } else {
        const response = await axios.get(`${server}/usage/`, {
          params: { ...requestParams, username: userToEdit },
          headers: requestHeader,
          signal: controller.signal,
        });
        setData(response.data);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        setAlertMsg('Request canceled by the user.');
      } else {
        setAlertMsg(
          `Problems fetching usage information: ${getResponseError(err)}`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const getRemainingQuota = async () => {
      try {
        const result = await axios({
          url: `${server}/usage/quota`,
          method: 'GET',
          params: { username: userToEdit },
        });
        if (result.data && result.data.length) {
          const quotaRemaining = calcRemainingQuota(result.data);
          setRemainingQuota(quotaFormattingFn(quotaRemaining.volume));
        } else {
          setRemainingQuota('unlimited');
        }
      } catch (err) {
        setAlertMsg(
          `Problems fetching quota data. Error message: ${getResponseError(err)}`,
        );
      }
    };
    getRemainingQuota();
  }, [server, setAlertMsg, userToEdit, quotaFormattingFn]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Cleanup: Abort any inflight request if the user unmounts/navigates away
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [abortControllerRef]);

  return (
    <>
      <div>
        <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
          <div className="h2">
            <div className="h6 m-1">Remaining Quota: {remainingQuota}</div>
          </div>
          <div className="d-flex gap-2">
            {isLoading ? (
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-1"></i> Cancel
              </button>
            ) : (
              <button className="btn btn-primary" onClick={fetchData}>
                <i className="bi bi-cloud-download me-1"></i> Fetch Usage
              </button>
            )}
            <div className="btn-toolbar mb-2 mb-md-0">
              <div className="btn-group me-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={fetchData}
                >
                  Refresh
                  <RefreshCw width="12px" className="ms-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-sm-6 col-12 mb-4">
            <div className="row">
              <div className="col-4">From:</div>
              <div className="col-8">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                />
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-12 mb-4">
            <div className="row">
              <div className="col-4">To:</div>
              <div className="col-8">
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                />
              </div>
            </div>
          </div>
        </div>
        {userToEditIsInviter && (
          <div className="col-sm-6 mb-4">
            <label>
              Show Invitees?
              <input
                name="showinvitees"
                type="checkbox"
                className="ms-2"
                checked={recursive}
                onChange={(e) => {
                  setRecursive(e.target.checked);
                }}
              />
            </label>
          </div>
        )}
        <Tab.Container
          defaultActiveKey="dashboard"
          activeKey={location.pathname.split('/').pop()}
          onSelect={(key) => navigate(key)}
        >
          <Nav className="nav-tabs">
            <Nav.Item>
              <Nav.Link eventKey="dashboard">Dashboard</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="timeline">Timeline</Nav.Link>
            </Nav.Item>
          </Nav>
        </Tab.Container>
        <Tab.Content>
          <Outlet
            context={{ data, startDate, endDate, isLoading, downloadProgress }}
          />
        </Tab.Content>
      </div>
    </>
  );
};

export default Usage;
