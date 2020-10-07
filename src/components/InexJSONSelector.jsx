import React, { useState, useEffect } from "react";

export const InexJSONSelector = props => {
    const {onChangeHandler, label} = props;

    const [filterResults, setFilterResults] = useState(false);
    const [toggleIncludeExclude, setToggleIncludeExclude] = useState("include");
    const [includeFiles, setIncludeFiles] = useState("");
    const [excludeFiles, setExcludeFiles] = useState("");

    const updateFilterResults = e => {
        setFilterResults(e.target.checked);
    }
    const updateToggleIncludeExclude = e => {
        setToggleIncludeExclude(e.target.value);
    }
    const updateIncludeFiles = e => {
        setIncludeFiles(e.target.value);
    }
    const updateExcludeFiles = e => {
        setExcludeFiles(e.target.value);
    }
    
    useEffect(() => {
        if (filterResults) {
            if (toggleIncludeExclude === "include") {
                onChangeHandler(JSON.stringify({
                    type: "include",
                    files: includeFiles.split(",").map(el => el.trim())
                }));
            } else {
                onChangeHandler(JSON.stringify({
                    type: "exclude",
                    files: excludeFiles.split(",").map(el => el.trim())
                }));
            }
        } else {
            onChangeHandler("");
        }
    }, [filterResults, toggleIncludeExclude, includeFiles, excludeFiles, onChangeHandler]);

    return (
        <React.Fragment>
            <div className="form-check">
                <input type="checkbox" className="form-check-input" checked={filterResults} onChange={updateFilterResults}
                id="filterResults"/>
                <label className="form-check-label" htmlFor="filterResults">{label? label: "Filter results (e.g. to reduce the size of the results archive)?"}</label>
            </div>
            {filterResults && (
                <React.Fragment>
                    <div className="form-group mt-3 mb-3">
                        <label htmlFor="toggleIncludeExclude">
                            Include or exclude files from results archive?
                        </label>
                        <select id="toggleIncludeExclude" className="form-control" value={toggleIncludeExclude} onChange={updateToggleIncludeExclude}>
                            <option key="include" value="include">include</option>
                            <option key="exclude" value="exclude">exclude</option>
                        </select>
                    </div>
                    {toggleIncludeExclude === "include" ? 
                        <div className="form-group">
                            <label htmlFor="includeFiles" className="sr-only">
                                Files to include in results (optional, comma-separated)
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="includeFiles"
                                placeholder="Files to include in results (comma-separated, optional)"
                                autoComplete="on"
                                value={includeFiles}
                                onChange={updateIncludeFiles}
                            />
                        </div> :
                        <div className="form-group">
                            <label htmlFor="excludeFiles" className="sr-only">
                            Files to exclude from results (optional, comma-separated)
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="excludeFiles"
                                placeholder="Files to exclude from results (comma-separated, optional)"
                                autoComplete="on"
                                value={excludeFiles}
                                onChange={updateExcludeFiles}
                            />
                        </div>
                    }
                </React.Fragment>)
            }
        </React.Fragment>
    );
};

export default InexJSONSelector;
