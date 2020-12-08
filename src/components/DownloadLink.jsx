import React, { useState, useContext } from "react";
import axios from "axios";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";

export default function DownloadLink({ url, filename, children, className, jsonSubkey }) {
  const [, setAlertMsg] = useContext(AlertContext);
  const [percentComleted, setPercentCompleted] = useState(0);
  const [linkDisabled, setLinkDisabled] = useState(false);
  const [cancelTokenSource, setCancelTokenSource] = useState(axios.CancelToken.source());

  const abortDownload = () => {
    cancelTokenSource.cancel();
  }

  const handleAction = () => {
    setLinkDisabled(true);
    axios({
      url: url,
      method: "GET",
      responseType: jsonSubkey ? "json" : "blob",
      onDownloadProgress: progressEvent => {
        if (progressEvent.total > 0) {
          setPercentCompleted(Math.floor((progressEvent.loaded * 100) / progressEvent.total));
        } else if (progressEvent.srcElement.getResponseHeader('Content-Length')) {
          setPercentCompleted(Math.floor((progressEvent.loaded * 100) /
            progressEvent.srcElement.getResponseHeader('Content-Length')));
        }
      },
      cancelToken: cancelTokenSource.token
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([jsonSubkey ? response.data[jsonSubkey] : response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      setLinkDisabled(false);
    }).catch(err => {
      if (axios.isCancel(err)) {
        setCancelTokenSource(axios.CancelToken.source());
      } else {
        setAlertMsg(`Problems fetching ${filename}. Error message: ${getResponseError(err)}`);
      }
      setLinkDisabled(false);
    });
  }

  return (
    <>
      <button
        className={className}
        onClick={handleAction}
        disabled={linkDisabled}>
        {linkDisabled ? `${percentComleted}%` : children}
      </button>
      {linkDisabled &&
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={abortDownload}>x
        </button>}
    </>
  )
}