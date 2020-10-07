import React, { useState } from "react";
import { ToggleLeft, ToggleRight } from "react-feather";

const moment = require("moment");

const TimeDisplay = props => {
  const [rel, setRel] = useState(true);

  function toggleRel() {
    setRel(!rel);
  }

  return (
    <button className="btn btn-sm btn-outline-info" onClick={toggleRel}>
      {rel ? (
        <ToggleLeft size={18} style={{ marginTop: "2px" }} />
      ) : (
        <ToggleRight size={18} style={{ marginTop: "2px" }} />
      )}
      &nbsp;
      <span className="flex-grow-1">
        {" "}
        {rel
          ? moment.utc(props.time).fromNow()
          : moment.utc(props.time).local().format("MMM Do, H:mm")}
      </span>
    </button>
  );
};

export default TimeDisplay;
