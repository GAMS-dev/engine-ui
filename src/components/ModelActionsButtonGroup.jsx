import React, { useContext } from "react";
import DownloadLink from "./DownloadLink";
import {AlertContext} from "./Alert";
import axios from "axios";

const ModelActionsButtonGroup = props => {
  const { id, namespace, server, setRefresh } = props;
  
  const [, setAlertMsg] = useContext(AlertContext);

  function deleteModel() {
    axios
      .delete(
        `${server}/namespaces/${namespace.name}/${id}`,
        {}
      )
      .then(res => {
        setRefresh(refreshCnt => ({
          refresh: refreshCnt + 1
        }));
      })
      .catch(err => {
        setAlertMsg(`Problems deleting model. Error message: ${err.message}`);
      });
  }
  
  return (
    <>
        {namespace && 
            <div className="btn-group">
            {(namespace.permission & 4) === 4 && 
                <DownloadLink url={`${server}/namespaces/${namespace.name}/${id}`} filename={`${id}.zip`} 
                    className="btn btn-sm btn-outline-info">
                    Download
                </DownloadLink>}
            {(namespace.permission & 2) === 2 &&
            <button className="btn btn-sm btn-outline-danger" onClick={deleteModel}>Delete</button>}
            </div> 
        }
    </>
  );
};
export default ModelActionsButtonGroup;
