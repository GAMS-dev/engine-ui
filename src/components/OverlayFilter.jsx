import React, { useState, useRef, useEffect } from "react";
import { OverlayTrigger, Tooltip, FormControl } from "react-bootstrap";
import { Filter } from "react-feather";


const OverlayFilter = props => {
    const { width, filterKey, onChange, resetFilter } = props;

    const [showTT, setShowTT] = useState(false);
    const [filterVal, setFilterVal] = useState("");
    const target = useRef(null);

    useEffect(() => {
        setFilterVal("");
    }, [resetFilter]);

    return (
        <>
            <OverlayTrigger
                placement="bottom"
                show={showTT}
                rootClose
                trigger="click"
                onToggle={() => setShowTT(!showTT)}
                overlay={
                    <Tooltip>
                        <FormControl
                            placeholder="Filter"
                            aria-label="Filter"
                            autoFocus
                            value={filterVal}
                            onChange={(e) => {
                                setFilterVal(e.target.value);
                                onChange(filterKey, e.target.value)
                            }}
                        />
                    </Tooltip>
                }
            >
                <span ref={target}><Filter size={width} /></span>
            </OverlayTrigger>
        </>
    );
};

export default OverlayFilter;
