import React from "react";

const TimeDiffDisplay = props => {

    const h = Math.floor(props.time / 3600);
    const m = Math.floor(props.time % 3600 / 60);
    const s = Math.floor(props.time % 3600 % 60);

    const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
    const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";

    let timeDisplay = (" " + hDisplay + mDisplay + sDisplay);
    if (timeDisplay.endsWith(", ")) {
        timeDisplay = timeDisplay.slice(0, -2);
    } else if (timeDisplay === " ") {
        timeDisplay = "< 1 second"
    }

    return (
        <span className={props.classNames}>
            {timeDisplay}
        </span>
    );
};

export default TimeDiffDisplay;
