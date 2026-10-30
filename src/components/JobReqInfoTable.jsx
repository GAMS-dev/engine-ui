import { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { Modal, Button } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext';
import AlertContext from '../contexts/AlertContext';
import DownloadLink from './DownloadLink';
import TimeDisplay from './TimeDisplay';
import JobAccessGroupsSelector from './JobAccessGroupsSelector';
import SubmitButton from './SubmitButton';
import TooltipBadge from './TooltipBadge';
import { formatInstanceSpecsParts, getResponseError } from '../util/util';
import axios from 'axios';
import { Edit3 } from 'lucide-react';

const REQUEST_TOOLTIPS = {
  cpu_request: 'CPU Request',
  memory_request: 'Memory Request',
  workspace_request: 'Workspace Request',
};
import { UserLink } from './UserLink';
import UserSettingsContext from '../contexts/UserSettingsContext';
import InstanceSizingBadges from './InstanceSizingBadges';

const JobReqInfoTable = ({
  job,
  isHcJob,
  inKubernetes,
  setRefreshJob,
  location,
}) => {
  const [{ server }] = useContext(AuthContext);
  const [, setAlertMsg] = useContext(AlertContext);
  const [userSettings] = useContext(UserSettingsContext);
  const [jobLabels, setJobLabels] = useState(null);
  const [showEditAccessGroupsDialog, setShowEditAccessGroupsDialog] =
    useState(false);
  const [accessGroups, setAccessGroups] = useState(
    job.access_groups == null
      ? []
      : job.access_groups.map((group) => ({ label: group, value: group })),
  );
  const [isSubmitting, setIsSubmitting] = useState('');
  const [submissionErrorMsg, setSubmissionErrorMsg] = useState('');
  const [jobTag, setJobTag] = useState(job.tag == null ? '' : job.tag);
  const [tmpJobTag, setTmpJobTag] = useState(job.tag == null ? '' : job.tag);
  const [jobTagUpdating, setJobTagUpdating] = useState(false);

  const preventUpdateTagRef = useRef(false);

  const formatLabel = useCallback(
    (label) => {
      if (label == null || label.length < 2 || label[1] === '') {
        return '';
      }
      if (label[0] === 'memory_request') {
        return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(label[1])} MiB RAM`;
      } else if (label[0] === 'cpu_request') {
        return `${label[1]} vCPU`;
      } else if (label[0] === 'workspace_request') {
        return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(label[1])} MiB Disk`;
      } else if (label[0] === 'multiplier') {
        return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(label[1])}${userSettings.multiplierUnit}`;
      }
      return '';
    },
    [userSettings],
  );

  const updateJobTag = async (e) => {
    if (e.key !== 'Enter') {
      if (e.key === 'Escape') {
        setTmpJobTag(jobTag);
        preventUpdateTagRef.current = true;
        e.target.blur();
      }
      return;
    }
    try {
      setJobTagUpdating(true);
      await axios.put(
        `${server}/${isHcJob ? 'hypercube' : 'jobs'}/${encodeURIComponent(job.token)}/tag`,
        {
          tag: tmpJobTag,
        },
      );
      setJobTag(tmpJobTag);
      if (e.target != null) {
        preventUpdateTagRef.current = true;
        e.target.blur();
      }
    } catch (err) {
      setAlertMsg(
        `Problems updating job tag. Error message: ${getResponseError(err)}`,
      );
    } finally {
      setJobTagUpdating(false);
    }
  };

  useEffect(() => {
    if (!inKubernetes || !job.labels) {
      setJobLabels(null);
      return;
    }
    let jobLabelsTmp = Object.entries(job.labels).filter((el) => el[1] != null);
    if (jobLabelsTmp.findIndex((label) => label[0] === 'instance') !== -1) {
      const memoryRequest = jobLabelsTmp.find(
        (label) => label[0] === 'memory_request',
      );
      const cpuRequest = jobLabelsTmp.find(
        (label) => label[0] === 'cpu_request',
      );
      const multiplier = jobLabelsTmp.find(
        (label) => label[0] === 'multiplier',
      );
      const workspaceRequest = jobLabelsTmp.find(
        (label) => label[0] === 'workspace_request',
      );
      setJobLabels(
        jobLabelsTmp
          .filter(
            (el) =>
              ![
                'memory_request',
                'cpu_request',
                'multiplier',
                'workspace_request',
                'tolerations',
                'node_selectors',
              ].includes(el[0]),
          )
          .map((el) => {
            if (el[0] !== 'instance') {
              return el;
            }
            const elTmp = el;
            elTmp[1] = formatInstanceSpecsParts(
              {
                label: elTmp[1],
                cpu_request: cpuRequest?.length === 2 ? cpuRequest[1] : '',
                memory_request:
                  memoryRequest?.length === 2 ? memoryRequest[1] : '',
                multiplier: multiplier?.length === 2 ? multiplier[1] : '',
              },
              userSettings.multiplierUnit,
            );
            elTmp[2] = formatLabel(workspaceRequest);
            return elTmp;
          }),
      );
    } else {
      setJobLabels(jobLabelsTmp);
    }
  }, [job, inKubernetes, setJobLabels, userSettings, formatLabel]);

  const handleCloseEditAccessGroupsDialog = () => {
    setShowEditAccessGroupsDialog(false);
    setSubmissionErrorMsg('');
  };

  const handleUpdateAccessGroups = async () => {
    setIsSubmitting(true);
    setSubmissionErrorMsg('');
    try {
      const newAccessGroupsForm = new FormData();
      accessGroups.forEach((group) => {
        newAccessGroupsForm.append('access_groups', group.value);
      });
      await axios.put(
        `${server}/${isHcJob ? 'hypercube' : 'jobs'}/${encodeURIComponent(job.token)}/access-groups`,
        newAccessGroupsForm,
      );
      setRefreshJob((refresh) => refresh + 1);
    } catch (err) {
      setSubmissionErrorMsg(
        `Problems updating access groups. Error message: ${getResponseError(err)}`,
      );
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="table-card">
        <table className="table table-sm table-fixed">
          <thead className="table-header-primary">
            <tr>
              <th colSpan="2" className="text-center">
                Request
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Token</th>
              <td>
                <small>
                  {job.token}
                  {isHcJob && (
                    <sup>
                      <span className="badge rounded-pill bg-primary ms-1">
                        HC
                      </span>
                    </sup>
                  )}
                </small>
              </td>
            </tr>
            <tr>
              <th>Tag</th>
              <td>
                <input
                  type="text"
                  className="table-form-control"
                  id="jobTag"
                  value={tmpJobTag}
                  disabled={jobTagUpdating}
                  onBlur={() => {
                    if (preventUpdateTagRef.current) {
                      preventUpdateTagRef.current = false;
                    } else {
                      updateJobTag({ key: 'Enter' });
                    }
                  }}
                  onChange={(e) => setTmpJobTag(e.target.value)}
                  onKeyDown={updateJobTag}
                />
              </td>
            </tr>
            <tr>
              <th>Submitted by</th>
              <td>
                <UserLink user={job.user} />
              </td>
            </tr>
            <tr>
              <th>Submitted at</th>
              <td>
                <TimeDisplay time={job.submitted_at} />
              </td>
            </tr>
            <tr>
              <th>Namespace</th>
              <td>{job.namespace}</td>
            </tr>
            <tr>
              <th>
                Access groups
                <button
                  className="btn btn-sm ms-1"
                  onClick={() => setShowEditAccessGroupsDialog(true)}
                >
                  <Edit3 size={18} />
                </button>
              </th>
              <td>
                {job.access_groups == null || job.access_groups.length === 0
                  ? '-'
                  : job.access_groups.map((group) => (
                      <Link
                        key={group}
                        className="badge bg-secondary me-1"
                        to={`/groups/${encodeURIComponent(job.namespace)}/${encodeURIComponent(group)}`}
                      >
                        {group}
                      </Link>
                    ))}
              </td>
            </tr>
            {job.priority != null && (
              <tr>
                <th>Priority</th>
                <td>
                  {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)}
                </td>
              </tr>
            )}
          </tbody>
          <thead className="table-header-secondary">
            <tr>
              <th colSpan="2" className="text-center">
                Model Information
                {location && location.state}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Model</th>
              <td>
                {job.is_temporary_model ? (
                  <span>
                    {job.model} &nbsp;
                    <TooltipBadge
                      id="temporaryModelTT"
                      className="bg-secondary"
                      tooltip="Temporary models are provided with the job, they cannot be downloaded"
                    >
                      Temporary
                    </TooltipBadge>
                  </span>
                ) : job.model_consistent === true ? (
                  <DownloadLink
                    url={`${server}/namespaces/${encodeURIComponent(job.namespace)}/models/${encodeURIComponent(job.model)}`}
                    filename={`${job.model}.zip`}
                    className="badge bg-secondary"
                  >
                    {job.model}
                  </DownloadLink>
                ) : (
                  <TooltipBadge
                    id="inconsistentModelTT"
                    className="bg-secondary"
                    tooltip="The model used for this job no longer exists or was updated after submission"
                  >
                    {job.model}
                  </TooltipBadge>
                )}
              </td>
            </tr>
            <tr>
              <th>Data Provided</th>
              <td>{job.is_data_provided ? 'Yes' : 'No'}</td>
            </tr>
          </tbody>
          <thead className="table-header-secondary">
            <tr>
              <th colSpan="2" className="text-center">
                GAMS Call Related
              </th>
            </tr>
          </thead>
          <tbody>
            {!job.is_temporary_model && (
              <tr>
                <td colSpan="2">
                  <div
                    className="alert alert-info"
                    role="alert"
                    style={{ fontSize: '10pt' }}
                  >
                    The arguments provided with the model are not mentioned
                    here. Therefore the list of arguments shown here may not be
                    complete! See the GAMS log for a complete list of arguments.
                  </div>
                </td>
              </tr>
            )}
            <tr>
              <th>Arguments</th>
              <td>
                {job.arguments.map((c) => (
                  <TooltipBadge
                    key={c}
                    id={`argTT-${c}`}
                    className="bg-secondary m-1 badge-clip"
                    tooltip={c}
                  >
                    {c}
                  </TooltipBadge>
                ))}
                {job.arguments.length === 0 && '-'}
              </td>
            </tr>
          </tbody>
          <thead className="table-header-secondary">
            <tr>
              <th colSpan="2" className="text-center">
                Result Related
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Standard output filename</th>
              <td>{job.stdout_filename || '-'}</td>
            </tr>
            {!isHcJob && (
              <>
                <tr>
                  <th>Text Entries</th>
                  <td>
                    {job.text_entries.length > 0
                      ? job.text_entries.map((c) => (
                          <span
                            key={c.entry_name}
                            className="badge bg-secondary m-1"
                          >
                            {c.entry_name}
                          </span>
                        ))
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <th>Stream Entries</th>
                  <td>
                    {job.stream_entries.length > 0
                      ? job.stream_entries.map((c) => (
                          <span key={c} className="badge bg-secondary m-1">
                            {c}
                          </span>
                        ))
                      : '-'}
                  </td>
                </tr>
              </>
            )}
            {jobLabels && (
              <tr>
                <th>Resources</th>
                <td style={{ minHeight: '20px' }}>
                  {jobLabels.map((el) => {
                    if (el[0] in REQUEST_TOOLTIPS) {
                      return (
                        <TooltipBadge
                          key={el[0]}
                          id={`${el[0]}TT`}
                          className="bg-secondary m-1"
                          tooltip={REQUEST_TOOLTIPS[el[0]]}
                        >
                          {formatLabel(el)}
                        </TooltipBadge>
                      );
                    } else if (el[0] === 'resource_warning') {
                      if (el[1] === 'none') {
                        return <span key="resource_warning"></span>;
                      } else {
                        return (
                          <TooltipBadge
                            key="resource_warning"
                            id="resourceWarningTT"
                            className="bg-danger m-1"
                            tooltip="Resource Warning"
                          >
                            {`Out of ${el[1].replaceAll('_', ' ')}`}
                          </TooltipBadge>
                        );
                      }
                    } else if (el[0] === 'instance') {
                      return (
                        <TooltipBadge
                          key="instance"
                          id="instanceTT"
                          className="bg-info m-1 text-start lh-base"
                          style={{ whiteSpace: 'normal' }}
                          tooltip={el[2]}
                        >
                          <div className="fw-bold">{el[1].label}</div>
                          <div>{el[1].specs}</div>
                        </TooltipBadge>
                      );
                    } else if (el[0] === 'multiplier') {
                      return (
                        <TooltipBadge
                          key="multiplier"
                          id="multiplierTT"
                          className="bg-secondary m-1"
                          tooltip="Multiplier"
                        >
                          {`${el[1]}${userSettings.multiplierUnit}`}
                        </TooltipBadge>
                      );
                    } else if (Array.isArray(el[1])) {
                      return el[1].map((arrayEl, arrayIdx) => {
                        return (
                          <TooltipBadge
                            key={el[0] + arrayIdx}
                            id={`${el[0]}${arrayIdx}TT`}
                            className={`bg-${el[0] === 'tolerations' ? 'light' : 'info'} m-1`}
                            tooltip={
                              el[0] === 'tolerations'
                                ? 'Toleration'
                                : 'Node Selector'
                            }
                          >
                            {`${arrayEl.key}=${arrayEl.value}`}
                          </TooltipBadge>
                        );
                      });
                    }
                    return (
                      <span key={el[0]} className="badge bg-secondary m-1">
                        {el[1]}
                      </span>
                    );
                  }) || '-'}
                </td>
              </tr>
            )}
            {job.resource_stats != null && (
              <tr>
                <th>Instance Sizing</th>
                <td>
                  <InstanceSizingBadges resourceStats={job.resource_stats} />
                </td>
              </tr>
            )}
            <tr>
              <th>Job Dependencies</th>
              <td>
                {!job.dep_tokens || job.dep_tokens.length === 0
                  ? '-'
                  : job.dep_tokens.map((t) => (
                      <TooltipBadge
                        key={t}
                        id={`depTT-${t}`}
                        className="bg-secondary m-1"
                        tooltip={t}
                        tabIndex={-1}
                      >
                        <small>
                          <Link to={'/jobs/' + t} style={{ color: '#fff' }}>
                            {t.split('-')[0]}
                          </Link>
                        </small>
                      </TooltipBadge>
                    ))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Modal
        show={showEditAccessGroupsDialog}
        onHide={handleCloseEditAccessGroupsDialog}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateAccessGroups();
            return false;
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Change Access Groups</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div
              className="invalid-feedback"
              style={{ display: submissionErrorMsg !== '' ? 'block' : 'none' }}
            >
              {submissionErrorMsg}
            </div>
            <fieldset disabled={isSubmitting}>
              <JobAccessGroupsSelector
                namespace={job.namespace}
                value={accessGroups}
                onChange={setAccessGroups}
                groupWhitelist={job.access_groups}
              />
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleCloseEditAccessGroupsDialog}
            >
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
              Update
            </SubmitButton>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  );
};

export default JobReqInfoTable;
