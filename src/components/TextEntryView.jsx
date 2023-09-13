import React, { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";

const TextEntryView = props => {
  const [, setAlertMsg] = useContext(AlertContext);

  const { textEntries, server } = props;
  const [cache, setCache] = useState([]);
  const [teContent, setTeContent] = useState("")
  const { token } = useParams();
  const [truncationFlag, setTruncationFlag] = useState(false);
  const viewCharLimit = 1000000;
  const [entryIndex, setEntryIndex] = useState(0);

  useEffect(() => {
    /*{
      entry_name: "Select text entry",
      entry_value: "You will see here",
      entry_size: 17
    }*/
    if (cache[entryIndex] && cache[entryIndex].entry_value) {
      if (cache[entryIndex].entry_size > viewCharLimit) {
        setTruncationFlag(true);
      } else {
        setTruncationFlag(false);
      }
      setTeContent(cache[entryIndex].entry_value);
    } else {
      axios
        .get(
          `${server}/jobs/${encodeURIComponent(token)}/text-entry`,
          {
            params: {
              length: viewCharLimit + 1,
              entry_name: textEntries[entryIndex].entry_name
            }
          }
        )
        .then(res => {
          const cacheTmp = cache;
          if (res.data.entry_value == null) {
            cacheTmp[entryIndex] = {
              entry_size: 0,
              entry_value: ""
            };
          } else {
            cacheTmp[entryIndex] = {
              entry_size: res.data.entry_value.length,
              entry_value: res.data.entry_value
            };
          }
          setCache(cacheTmp);
          if (cache[entryIndex].entry_size > viewCharLimit) {
            setTruncationFlag(true);
          } else {
            setTruncationFlag(false);
          }
          setTeContent(cache[entryIndex].entry_value);
        })
        .catch(err => {
          setAlertMsg(`A problem has occurred while retrieving the text entry. Error message: ${getResponseError(err)}`);
        });
    }
  }, [entryIndex, server, cache, setCache, setTeContent, setAlertMsg, textEntries, token]);

  return (
    <form action="">
      <div className="mb-3">
        <table className="table table-sm">
          <thead className="table-dark">
            <tr>
              <th className="text-center">Text Entries</th>
            </tr>
          </thead>
        </table>
        <div className="d-flex">
          <select
            name="text_entry_sel"
            id="text_entry_sel"
            className="form-control form-select"
            onChange={e => setEntryIndex(e.target.selectedIndex)}
          >
            {textEntries.map(e => (
              <option key={e.entry_name} value={e.entry_value}>
                {e.entry_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label htmlFor="exampleFormControlTextarea1">Value</label>
        {truncationFlag &&
          <div>
            <small className="text-danger">
              The text entry is too large to be displayed here and was truncated to {viewCharLimit} characters. Download the text entry to see the entire content.
            </small>
          </div>
        }
        <textarea
          className="form-control text-monospace nowrap"
          id="exampleFormControlTextarea1"
          rows="15"
          value={teContent}
          readOnly
        ></textarea>
      </div>
    </form>
  );
};

export default TextEntryView;
