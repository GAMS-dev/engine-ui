import React, {useContext} from "react";
import {AuthContext} from "../AuthContext";
import DownloadLink from "./DownloadLink";
import TimeDisplay from "./TimeDisplay";

const JobReqInfoTable = props => {
  const [{ server }] = useContext(AuthContext);
  const { job, isHcJob } = props;
  return (
    <table className="table table-sm">
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
            <small>{job.token}</small>
          </td>
        </tr>
        <tr>
          <th>Submitted</th>
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
                url={`${server}/namespaces/${job.namespace}/${job.model}`} 
                filename={`${job.model}.zip`}
                className="badge badge-secondary">
                {job.model}
              </DownloadLink>
            )}
          </td>
        </tr>
        <tr>
          <th>Data provided</th>
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
            <div className="alert alert-info" role="alert" style={{fontSize: "10pt"}}>
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
        <tr>
          <td colSpan="2">
            <code>
              gams {job.model}.gms {job.arguments.join(" ")} lo=3 input='{job.model}.gms'
              {job.stdout_filename? ` > ${job.stdout_filename}`: ""}
            </code>
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
            <th>Text entries</th>
            <td>
              {job.text_entries.length > 0? job.text_entries.map(c => (
                <span key={c.entry_name} className="badge badge-secondary m-1">
                  {c.entry_name}
                </span>
              )): "-"}
            </td>
          </tr>
          <tr>
            <th>Stream entries</th>
            <td>
              {job.stream_entries.length > 0? job.stream_entries.map(c => (
                <span key={c} className="badge badge-secondary m-1">
                  {c}
                </span>
              )): "-"}
            </td>
          </tr>
        </>}
      </tbody>
    </table>
  );
};

export default JobReqInfoTable;
