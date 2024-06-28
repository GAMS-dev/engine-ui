import React, { useState } from "react";
import { ToggleLeft, ToggleRight } from "react-feather";

const moment = require("moment");

const TimeDisplay = ({ time }) => {
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
          ? moment.utc(time).fromNow()
          : moment.utc(time).local().format(moment.utc(time).isSame(new Date(), 'year') ? "MMM Do, H:mm" : "MMM Do YYYY, H:mm")}
      </span>
    </button>
  );
};

export default TimeDisplay;
