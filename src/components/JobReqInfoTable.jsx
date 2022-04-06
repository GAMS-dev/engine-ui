import React, { useContext, useState } from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import DownloadLink from "./DownloadLink";
import TimeDisplay from "./TimeDisplay";

const JobReqInfoTable = props => {
  const [{ server }] = useContext(AuthContext);
  const { job, isHcJob, inKubernetes } = props;
  const [jobLabels, setJobLabels] = useState(null);

  const formatLabel = (label) => {
    if (label == null || label.length < 2 || label[1] === "") {
      return "";
    }
    if (label[0] === "memory_request") {
      return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(label[1])} MiB RAM`;
    } else if (label[0] === "cpu_request") {
      return `${label[1]} vCPU`;
    } else if (label[0] === "workspace_request") {
      return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(label[1])} MiB Disk`;
    } else if (label[0] === "multiplier") {
      return `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(label[1])}x`;
    }
    return "";
  }

  useEffect(() => {
    if (!inKubernetes || !job.labels) {
      setJobLabels(null);
      return;
    }
    let jobLabelsTmp = Object.entries(job.labels).filter(el => el[1] != null);
    if (jobLabelsTmp.findIndex(label => label[0] === "instance") !== -1) {
      const memoryRequest = jobLabelsTmp.find(label => label[0] === "memory_request");
      const cpuRequest = jobLabelsTmp.find(label => label[0] === "cpu_request");
      const multiplier = jobLabelsTmp.find(label => label[0] === "multiplier");
      const workspaceRequest = jobLabelsTmp.find(label => label[0] === "workspace_request");
      setJobLabels(jobLabelsTmp
        .filter(el => !["memory_request", "cpu_request",
          "multiplier", "workspace_request", "tolerations", "node_selectors"].includes(el[0]))
        .map(el => {
          if (el[0] !== "instance") {
            return el;
          }
          const elTmp = el;
          elTmp[1] = `${elTmp[1]} (${formatLabel(cpuRequest)}, ${formatLabel(memoryRequest)}, ${formatLabel(multiplier)})`;
          elTmp[2] = formatLabel(workspaceRequest);
          return elTmp;
        })
      )
    } else {
      setJobLabels(jobLabelsTmp);
    }
  }, [job, inKubernetes, setJobLabels]);

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
            ) : (job.model_consistent === true ?
              <DownloadLink
                url={`${server}/namespaces/${encodeURIComponent(job.namespace)}/models/${encodeURIComponent(job.model)}`}
                filename={`${job.model}.zip`}
                className="badge badge-secondary">
                {job.model}
              </DownloadLink> :
              <span className="badge badge-secondary"
                title="The model used for this job no longer exists or was updated after submission">
                {job.model}
              </span>
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
        {!job.is_temporary_model && <tr>
          <td colSpan="2">
            <div className="alert alert-info" role="alert" style={{ fontSize: "10pt" }}>
              The arguments provided with the model are not mentioned here.
              Therefore the list of arguments shown here may not be complete!
              See the GAMS log for a complete list of arguments.
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
        {jobLabels &&
          <tr>
            <th>Resources</th>
            <td>{
              jobLabels.map(el => {
                if (el[0] === "cpu_request") {
                  return <span key="cpu_request" className="badge badge-secondary m-1" title="CPU Request">
                    {formatLabel(el)}
                  </span>
                } else if (el[0] === "memory_request") {
                  return <span key="memory_request" className="badge badge-secondary m-1" title="Memory Request">
                    {formatLabel(el)}
                  </span>
                } else if (el[0] === "workspace_request") {
                  return <span key="workspace_request" className="badge badge-secondary m-1" title="Workspace Request">
                    {formatLabel(el)}
                  </span>
                } else if (el[0] === "resource_warning") {
                  if (el[1] === "none") {
                    return <span key="resource_warning"></span>
                  } else {
                    return <span key="resource_warning" className="badge badge-danger m-1" title="Resource Warning">
                      {`Out of ${el[1]}`}
                    </span>
                  }
                } else if (el[0] === "instance") {
                  return <span key="instance" className="badge badge-info m-1" title={el[2]}>
                    {el[1]}
                  </span>
                } else if (el[0] === "multiplier") {
                  return <span key="multiplier" className="badge badge-secondary m-1" title="Multiplier">
                    {`${el[1]}x`}
                  </span>
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
