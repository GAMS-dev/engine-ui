import React, { useState, useContext } from "react";
import axios from "axios";
import {AlertContext} from "./Alert";

export default function DownloadLink ({ url, filename, children, className, jsonSubkey }) {
  const [, setAlertMsg] = useContext(AlertContext);
  const [percentComleted, setPercentCompleted] = useState(0);
  const [linkDisabled, setLinkDisabled] = useState(false);
  
  const handleAction = () => {
    setLinkDisabled(true);
    axios({
        url: url,
        method: "GET",
        responseType: jsonSubkey? "json" : "blob",
        onDownloadProgress: progressEvent => {
          if ( progressEvent.total > 0 ) {
            setPercentCompleted(Math.floor((progressEvent.loaded * 100) / progressEvent.total));
          } else if ( progressEvent.srcElement.getResponseHeader('Content-Length') ) {
            setPercentCompleted(Math.floor((progressEvent.loaded * 100) / 
              progressEvent.srcElement.getResponseHeader('Content-Length')));
          }
        }
    }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([jsonSubkey? response.data[jsonSubkey]: response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        setLinkDisabled(false);
    }).catch(err => {
      setAlertMsg(`Problems fetching ${filename}. Error message: ${err.message}`);
      setLinkDisabled(false);
    });
  }

  return (
    <>
      <button 
        className={className} 
        onClick={handleAction} 
        disabled={linkDisabled}>
           {linkDisabled? `${percentComleted}%`: children}
      </button>
    </>
  )
}