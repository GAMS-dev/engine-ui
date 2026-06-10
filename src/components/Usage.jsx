import axios from 'axios';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Button, Nav, Tab } from 'react-bootstrap';
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
import { DateTimePicker } from '@mantine/dates';
import { ClipLoader } from 'react-spinners';
import { Calendar } from 'react-feather';
import dayjs from 'dayjs';

const MAX_ITEMS_THRESHOLD = 1000;
const ITEMS_PER_PAGE = 100;

const Usage = () => {
  const { userToEditRoles } = useOutletContext();
  const { userToEdit } = useParams();
  const [data, setData] = useState([]);
  const [recursive, setRecursive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasProgressInfo, setHasProgressInfo] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
  const [dateRange, setDateRange] = useState([
    defaultStartDate,
    defaultEndDate,
  ]);
  const [selectedDateRange, setSelectedDateRange] = useState([
    defaultStartDate,
    defaultEndDate,
  ]);
  const [, setAlertMsg] = useContext(AlertContext);
  const [{ server }] = useContext(AuthContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const [remainingQuota, setRemainingQuota] = useState(-Infinity);
  const [userSettings] = useContext(UserSettingsContext);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const quotaFormattingFn = userSettings.quotaFormattingFn;

  const [refreshKey, setRefreshKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [requestParams, setRequestParams] = useState(null);
  const [endpointInfo, setEndpointInfo] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const abortControllerRef = useRef(null);

  const handleDateChange = (value) => {
    const [newStart, newEnd] = value;
    const [, prevEnd] = dateRange;

    const now = dayjs();

    // Helper to get the end of the day, capped at "now"
    const getCappedEnd = (date) => {
      const endOfDay = dayjs(date).endOf('day');
      // If the end of day is in the future, cap it to right now
      return endOfDay.isAfter(now) ? now.toDate() : endOfDay.toDate();
    };

    // 1. If an end date was just added for the first time
    if (newEnd && !prevEnd) {
      setDateRange([newStart, getCappedEnd(newEnd)]);
      return;
    }

    // 2. If the user changed the calendar day of the end date
    if (newEnd && prevEnd && !dayjs(newEnd).isSame(prevEnd, 'day')) {
      setDateRange([newStart, getCappedEnd(newEnd)]);
      return;
    }

    // 3. Otherwise, the user is modifying the time sliders,
    // We still want to ensure they can't slide the time past "now".
    if (newEnd && dayjs(newEnd).isAfter(now)) {
      setDateRange([newStart, now.toDate()]);
      return;
    }

    // Keep their exact selection if it's in the past
    setDateRange(value);
  };

  const fetchAllRemainingData = useCallback(
    async (total, metadata, params, abortControl, initialData) => {
      if (abortControl.current) {
        abortControl.current.abort();
      }

      const controller = new AbortController();
      abortControl.current = controller;

      setIsLoading(true);

      const requestHeader = {
        'X-Fields':
          'job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}},pool_usage{*}',
      };

      try {
        setDownloadProgress(0);

        const finalData = { ...initialData };

        const offsets = Object.fromEntries(
          Object.entries(finalData).map(([key, value]) => [key, value.length]),
        );

        const getCurrentCount = () =>
          Object.values(finalData).reduce((sum, m) => sum + m.length, 0);

        setDownloadProgress(
          Math.min(Math.round((getCurrentCount() / total) * 100), 100),
        );

        while (true) {
          const pendingRequests = [];
          const pendingOffsets = Object.fromEntries(
            Object.keys(offsets).map((key) => [key, 0]),
          );
          while (pendingRequests.length < 3) {
            let newItemsAdded = false;
            Object.entries(metadata).forEach(([key, value]) => {
              if (finalData[key].length + pendingOffsets[key] < value.total) {
                pendingRequests.push(
                  axios
                    .get(value.url, {
                      params: {
                        ...params,
                        offset: offsets[key] + pendingOffsets[key],
                      },
                      headers: requestHeader,
                      signal: controller.signal,
                    })
                    .then((r) => ({
                      key: key,
                      items: r.data.items,
                    })),
                );
                pendingOffsets[key] += metadata[key].perPage;
                newItemsAdded = true;
              }
            });
            if (newItemsAdded === false) {
              break;
            }
          }
          if (pendingRequests.length === 0) {
            break;
          }

          const nextBatch = await Promise.all(pendingRequests);

          nextBatch.forEach((batch) => {
            finalData[batch.key] = finalData[batch.key].concat(batch.items);
            offsets[batch.key] += metadata[batch.key].perPage;
          });

          setDownloadProgress(
            Math.min(Math.round((getCurrentCount() / total) * 100), 100),
          );
        }
        setData(finalData);
        setDataLoaded(true);
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
    },
    [setAlertMsg],
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if ([selectedDateRange, userToEditRoles].some((val) => val == null)) {
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setDataLoaded(false);
      setRequiresConfirmation(false);

      const requestParamsTmp = {
        recursive: userToEditRoles?.some((role) =>
          ['admin', 'inviter'].includes(role),
        )
          ? recursive
          : false,
        from_datetime: selectedDateRange[0].toISOString(),
        to_datetime: selectedDateRange[1].toISOString(),
      };
      const requestHeader = {
        'X-Fields':
          'job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}},pool_usage{*}',
      };

      try {
        if (serverInfo.use_brokerv2) {
          setHasProgressInfo(true);
          setDownloadProgress(0);

          requestParamsTmp.limit = ITEMS_PER_PAGE;
          setRequestParams(requestParamsTmp);

          const metadata = {
            job_usage: {
              url: `${server}/v2/usage/${userToEdit}/jobs`,
            },
            hypercube_job_usage: {
              url: `${server}/v2/usage/${userToEdit}/hypercube`,
            },
            pool_usage: {
              url: `${server}/v2/usage/${userToEdit}/pools`,
            },
          };

          const firstResponses = await Promise.all(
            Object.values(metadata).map((e) =>
              axios.get(e.url, {
                params: { ...requestParamsTmp, offset: 0 },
                headers: requestHeader,
                signal: controller.signal,
              }),
            ),
          );

          const finalData = {};

          firstResponses.forEach((res, idx) => {
            metadata[Object.keys(metadata)[idx]].total = parseInt(
              res.headers['x-total'],
            );
            const perPage = parseInt(res.headers['x-per-page']);
            metadata[Object.keys(metadata)[idx]].perPage = perPage;
            finalData[Object.keys(metadata)[idx]] = res.data.items;
          });

          const totalToFetch = Object.values(metadata).reduce(
            (sum, m) => sum + m.total,
            0,
          );
          setTotalCount(totalToFetch);
          setEndpointInfo(metadata);

          if (totalToFetch > MAX_ITEMS_THRESHOLD) {
            setData(finalData);
            setRequiresConfirmation(true);
            setIsLoading(false);
          } else {
            fetchAllRemainingData(
              totalToFetch,
              metadata,
              requestParamsTmp,
              abortControllerRef,
              finalData,
            );
          }
        } else {
          setRequestParams(requestParamsTmp);
          const response = await axios.get(`${server}/usage/`, {
            params: { ...requestParamsTmp, username: userToEdit },
            headers: requestHeader,
            signal: controller.signal,
          });
          setData(response.data);
          setDataLoaded(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          setAlertMsg('Request canceled by the user.');
        } else {
          setAlertMsg(
            `Problems fetching usage information: ${getResponseError(err)}`,
          );
        }
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [
    server,
    setAlertMsg,
    selectedDateRange,
    recursive,
    userToEdit,
    userToEditRoles,
    serverInfo.use_brokerv2,
    refreshKey,
    fetchAllRemainingData,
  ]);

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
          `Problems fetching quota data. Error message: ${getResponseError(
            err,
          )}`,
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
            <div className="h6 m-1">
              Remaining Quota:{' '}
              {remainingQuota === -Infinity ? (
                <ClipLoader size={12} />
              ) : (
                remainingQuota
              )}
            </div>
          </div>
          <div className="d-flex gap-2">
            {isLoading ? (
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-1"></i> Cancel
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDataLoaded(false);
                  setData([]);
                  setRefreshKey((prevKey) => prevKey + 1);
                }}
              >
                <i className="bi bi-cloud-download me-1"></i> Refresh Data
              </button>
            )}
          </div>
        </div>
        <div className="row">
          <DateTimePicker
            type="range"
            label="Pick Data Range"
            maxDate={new Date()}
            leftSection={<Calendar size={18} />}
            leftSectionPointerEvents="none"
            value={dateRange}
            onChange={handleDateChange}
            onDropdownClose={() => {
              const newDateRange = [
                dayjs(dateRange[0]).toDate(),
                dayjs(dateRange[1]).toDate(),
              ];
              if (
                newDateRange[0]?.getTime() !==
                  selectedDateRange[0]?.getTime() ||
                newDateRange[1]?.getTime() !== selectedDateRange[1]?.getTime()
              ) {
                setSelectedDateRange(newDateRange);
              }
            }}
          />
        </div>
        {userToEditRoles?.some((role) =>
          ['admin', 'inviter'].includes(role),
        ) && (
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
        {!isLoading && !dataLoaded && requiresConfirmation && (
          <div className="w-100 px-4 py-3">
            <Alert
              variant="warning"
              className="text-center max-width-md mx-auto shadow-sm"
            >
              <Alert.Heading as="p" className="fs-5 mb-3">
                Large Dataset Detected
              </Alert.Heading>
              <p className="mb-4 text-muted">
                This dataset contains <strong>{totalCount}</strong> items.
                Loading everything might take a moment.
              </p>
              <div className="d-flex justify-content-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="d-inline-flex align-items-center shadow-sm"
                  onClick={() =>
                    fetchAllRemainingData(
                      totalCount,
                      endpointInfo,
                      requestParams,
                      abortControllerRef,
                      data,
                    )
                  }
                >
                  Load All Data
                </Button>
              </div>
            </Alert>
          </div>
        )}
        {dataLoaded && (
          <>
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
                context={{
                  data,
                  startDate: selectedDateRange[0],
                  endDate: selectedDateRange[1],
                }}
              />
            </Tab.Content>
          </>
        )}
        {isLoading &&
          (hasProgressInfo ? (
            <div className="w-100 px-4 py-3">
              <p className="text-center mb-2">Fetching Usage Data...</p>
              <div className="progress" style={{ height: '20px' }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${downloadProgress}%` }}
                  aria-valuenow={downloadProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {downloadProgress}%
                </div>
              </div>
            </div>
          ) : (
            <ClipLoader />
          ))}
      </div>
    </>
  );
};

export default Usage;
