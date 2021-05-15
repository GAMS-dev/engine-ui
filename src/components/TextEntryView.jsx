import React, { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getResponseError } from "./util";
import { AlertContext } from "./Alert";

const TextEntryView = props => {
  const [, setAlertMsg] = useContext(AlertContext);

  const { setTextEntries, textEntries, server } = props;
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
    if (!textEntries[entryIndex].entry_size) {
      return;
    }
    if (!textEntries[entryIndex].entry_value) {
      if (textEntries[entryIndex].entry_size > viewCharLimit) {
        setTruncationFlag(true);
      } else {
        setTruncationFlag(false);
      }
      axios
        .get(
          `${server}/jobs/${encodeURIComponent(token)}/text-entry/${encodeURIComponent(textEntries[entryIndex].entry_name)}`,
          {
            params: {
              length: viewCharLimit
            }
          }
        )
        .then(res => {
          const newTextEntries = textEntries.map(e => ({ ...e }));
          newTextEntries[entryIndex].entry_value = res.data.entry_value;
          setTextEntries(newTextEntries);
        })
        .catch(err => {
          setAlertMsg(`A problem has occurred while retrieving the text entry. Error message: ${getResponseError(err)}`);
        });
    }
  }, [entryIndex, server, setTextEntries, setAlertMsg, textEntries, token]);

  return (
    <form action="">
      <div className="form-group">
        <table className="table table-sm">
          <thead className="thead-dark">
            <tr>
              <th className="text-center">Text Entries</th>
            </tr>
          </thead>
        </table>
        <div className="d-flex">
          <select
            name="text_entry_sel"
            id="text_entry_sel"
            className="form-control"
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
      <div className="form-group">
        <label htmlFor="exampleFormControlTextarea1">Value</label>
        {truncationFlag &&
          <div>
            <small className="text-danger">
              The text entry is too large to be displayed here and was truncated to {viewCharLimit} characters. Download the text entry to see the entire content.
            </small>
          </div>
        }
        <textarea
          className="form-control text-monospace"
          id="exampleFormControlTextarea1"
          rows="15"
          value={textEntries[entryIndex].entry_value}
          readOnly
        ></textarea>
      </div>
    </form>
  );
};

export default TextEntryView;
