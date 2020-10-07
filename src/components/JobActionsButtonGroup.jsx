import React, { useContext } from "react";
import { Link } from "react-router-dom";
import DownloadLink from "./DownloadLink";
import {AlertContext} from "./Alert";
import axios from "axios";

const JobActionsButtonGroup = props => {
  const { token, status, server, setRefresh } = props;
  
  const [, setAlertMsg] = useContext(AlertContext);

  function terminateJob() {
    axios
      .delete(
        token.startsWith("hc:")? `${server}/hypercube/${token.substring(3)}`: `${server}/jobs/${token}`,
        {}
      )
      .then(res => {
        setRefresh(refreshCnt => ({
          refresh: refreshCnt + 1
       }));
      })
      .catch(err => {
        setAlertMsg(`Problems terminating job. Error message: ${err.message}`);
      });
  }

  return (
    <div className="btn-group">
      <Link to={"/jobs/" + token} className="btn btn-sm btn-outline-info">
        Show
      </Link>
      {status > 9 && 
      <DownloadLink 
        url={token.startsWith("hc:")? `${server}/hypercube/${token.substring(3)}/result`: `${server}/jobs/${token}/result`} 
        filename="results.zip" 
        className="btn btn-sm btn-outline-info">
        Download
      </DownloadLink>}
      {status >= 0 && status < 10 &&
      <button className="btn btn-sm btn-outline-danger" onClick={terminateJob}>Cancel</button>}
    </div>
  );
};
export default JobActionsButtonGroup;
