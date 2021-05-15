import React from "react";
import { Link } from "react-router-dom";
import DownloadLink from "./DownloadLink";
import TerminateJobButton from "./TerminateJobButton";

const JobActionsButtonGroup = props => {
  const { token, status, server, setRefresh } = props;

  return (
    <div className="btn-group">
      <Link to={"/jobs/" + token} className="btn btn-sm btn-outline-info">
        Show
      </Link>
      {status > 9 &&
        <DownloadLink
          url={token.startsWith("hc:") ? `${server}/hypercube/${encodeURIComponent(token.substring(3))}/result` :
            `${server}/jobs/${encodeURIComponent(token)}/result`}
          filename="results.zip"
          className="btn btn-sm btn-outline-info">
          Download
      </DownloadLink>}
      <TerminateJobButton
        token={token}
        setRefresh={setRefresh}
        status={status}
        server={server} />
    </div>
  );
};
export default JobActionsButtonGroup;
