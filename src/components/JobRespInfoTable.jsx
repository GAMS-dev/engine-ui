import React, { useState } from "react";
import { FileText } from "react-feather";
import DownloadLink from "./DownloadLink";
import StreamEntryView from "./StreamEntryView";

const JobRespInfoTable = props => {
  const { job, statusCodes, server, isHcJob, setRefreshJob } = props;
  const [streamEntry, setStreamEntry] = useState(isHcJob ? null :
    (job.stream_entries.length ? (job.stream_entries[0] ? job.stream_entries[0] : null) : job.stdout_filename));
  const [textEntry, setTextEntry] = useState(isHcJob ? null : (job.text_entries[0] ? job.text_entries[0].entry_name : null));
  return (
    <table className="table table-sm">
      <thead className="thead-dark">
        <tr>
          <th colSpan="2" className="text-center">
            Result
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Status</th>
          <td>
            {job.status in statusCodes ? statusCodes[job.status] : job.status}
          </td>
        </tr>
        {isHcJob ?
          <tr>
            <th>Progress</th>
            <td>{`${job.finished}/${job.job_count} (${job.successfully_finished} successful)`}</td>
          </tr> :
          <>
            <tr>
              <th>Process status</th>
              <td>{job.process_status !== null ? job.process_status : "-"}</td>
            </tr>
            {job.status >= 10 && <tr>
              <th>Text entries</th>
              <td>
                <div className="form-group form-inline">
                  <select
                    className="form-control form-control-sm"
                    name="text-entry"
                    id="text-entry"
                    value={textEntry}
                    onChange={e => setTextEntry(e.target.value)}
                  >
                    {job.text_entries.map(e => (
                      <option key={e.entry_name} value={e.entry_name}>
                        {e.entry_name}
                      </option>
                    ))}
                  </select>
                &nbsp;
                {textEntry &&
                    <DownloadLink
                      url={`${server}/jobs/${job.token}/text-entry/${textEntry}`}
                      filename={textEntry}
                      jsonSubkey="entry_value">
                      <FileText size={18} />
                    </DownloadLink>
                  }
                </div>
              </td>
            </tr>}
            {job.status > 0 && job.status < 10 && <tr>
              <th>Stream entries</th>
              <td>
                <div className="form-group form-inline">
                  <select
                    className="form-control form-control-sm"
                    name="stream-entry"
                    id="stream-entry"
                    value={streamEntry}
                    onChange={e => setStreamEntry(e.target.value)}
                  >
                    {job.stream_entries.concat(job.stdout_filename).map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                &nbsp;
                <StreamEntryView
                    server={server}
                    streamEntry={streamEntry}
                    setRefreshJob={setRefreshJob}
                    isStdOut={streamEntry === job.stdout_filename}
                  />
                </div>
              </td>
            </tr>}
          </>
        }
        {job.status >= 10 && <tr>
          <th>Result zip</th>
          <td>
            <DownloadLink url={isHcJob ? `${server}/hypercube/${job.token}/result` : `${server}/jobs/${job.token}/result`} filename="results.zip"
              className="btn btn-sm btn-outline-info">
              Download
          </DownloadLink>
          </td>
        </tr>}
      </tbody>
    </table>
  );
};

export default JobRespInfoTable;
