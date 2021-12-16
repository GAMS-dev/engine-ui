import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import DownloadLink from "./DownloadLink";
import TimeDisplay from "./TimeDisplay";

const JobReqInfoTable = props => {
  const [{ server }] = useContext(AuthContext);
  const { job, isHcJob, inKubernetes } = props;
  let job_labels;
  if (inKubernetes && job.labels) {
    job_labels = Object.entries(job.labels).filter(el => el[1] != null);
  }
  return (
    <table className="table table-sm table-fixed">
      <thead className="thead-dark">
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
              {isHcJob && <sup>
                <span className="badge badge-pill badge-primary ml-1">HC</span>
              </sup>}
            </small>
          </td>
        </tr>
        <tr>
          <th>Submitted by</th>
          <td>
            {job.user.deleted ? <span className="badge badge-pill badge-secondary ml-1">deleted</span>
              : job.user.username}
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
      </tbody>
      <thead className="thead-light">
        <tr>
          <th colSpan="2" className="text-center">
            Model Information
            {props.location && props.location.state}
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
                <span
                  className="badge badge-secondary"
                  title="Temporary models are provided with the job, they cannot be downloaded"
                >
                  Temporary
                </span>
              </span>
            ) : (
              <DownloadLink
                url={`${server}/namespaces/${encodeURIComponent(job.namespace)}/models/${encodeURIComponent(job.model)}`}
                filename={`${job.model}.zip`}
                className="badge badge-secondary">
                {job.model}
              </DownloadLink>
            )}
          </td>
        </tr>
        <tr>
          <th>Data Provided</th>
          <td>{job.is_data_provided ? "Yes" : "No"}</td>
        </tr>
      </tbody>
      <thead className="thead-light">
        <tr>
          <th colSpan="2" className="text-center">
            GAMS Call Related
          </th>
        </tr>
      </thead>
      <tbody>
        {!job.is_temporary_model && job.includes_model_args !== true && <tr>
          <td colSpan="2">
            <div className="alert alert-info" role="alert" style={{ fontSize: "10pt" }}>
              The arguments provided with the model are not mentioned here.
              Therefore the list of arguments shown here may not be complete!
            </div>
          </td>
        </tr>}
        <tr>
          <th>Arguments</th>
          <td>
            {job.arguments.map(c => (
              <span key={c} className="badge badge-secondary m-1">
                {c}
              </span>
            ))}
            {job.arguments.length === 0 && "-"}
          </td>
        </tr>
      </tbody>
      <thead className="thead-light">
        <tr>
          <th colSpan="2" className="text-center">
            Result Related
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Standard output filename</th>
          <td>{job.stdout_filename || "-"}</td>
        </tr>
        {!isHcJob &&
          <>
            <tr>
              <th>Text Entries</th>
              <td>
                {job.text_entries.length > 0 ? job.text_entries.map(c => (
                  <span key={c.entry_name} className="badge badge-secondary m-1">
                    {c.entry_name}
                  </span>
                )) : "-"}
              </td>
            </tr>
            <tr>
              <th>Stream Entries</th>
              <td>
                {job.stream_entries.length > 0 ? job.stream_entries.map(c => (
                  <span key={c} className="badge badge-secondary m-1">
                    {c}
                  </span>
                )) : "-"}
              </td>
            </tr>
          </>}
        {job_labels &&
          <tr>
            <th>Resources</th>
            <td>{job_labels.map(el => {
              if (el[0] === "cpu_request") {
                return <span key="cpu_request" className="badge badge-secondary m-1">
                  {`${el[1]} vCPU`}
                </span>
              } else if (el[0] === "memory_request") {
                return <span key="memory_request" className="badge badge-secondary m-1">
                  {`${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(el[1])} MiB RAM`}
                </span>
              } else if (el[0] === "workspace_request") {
                return <span key="workspace_request" className="badge badge-secondary m-1">
                  {`${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(el[1])} MiB Disk`}
                </span>
              } else if (el[0] === "resource_warning") {
                if (el[1] === "none") {
                  return <span key="resource_warning"></span>
                } else {
                  return <span key="resource_warning" className="badge badge-danger m-1">{`Out of ${el[1]}`}</span>
                }
              } else if (Array.isArray(el[1])) {
                return el[1].map((arrayEl, arrayIdx) => {
                  return <span key={el[0] + arrayIdx}
                    className={`badge badge-${el[0] === 'tolerations' ? 'light' : 'info'} m-1`}
                    title={el[0] === 'tolerations' ? "Toleration" : "Node Selector"}>
                    {`${arrayEl.key}=${arrayEl.value}`}
                  </span>
                });
              }
              return <span key={el[0]} className="badge badge-secondary m-1">
                {el[1]}
              </span>
            }) || "-"}</td>
          </tr>}
        <tr>
          <th>Job Dependencies</th>
          <td>
            {(!job.dep_tokens || job.dep_tokens.length === 0) ?
              "-" :
              job.dep_tokens.map(t => (
                <span key={t} title={t} className="badge badge-secondary m-1">
                  <small>
                    <Link to={"/jobs/" + t} style={{ color: "#fff" }}>{t.split('-')[0]}</Link>
                  </small>
                </span>
              ))}
          </td>
        </tr>
      </tbody>
    </table >
  );
};

export default JobReqInfoTable;
