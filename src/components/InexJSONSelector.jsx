import React, { useState, useEffect } from "react";
import Select from 'react-select';

export const InexJSONSelector = props => {
    const { onChangeHandler, label, inexObject } = props;

    const [filterResults, setFilterResults] = useState(inexObject ? true : false);
    const [toggleIncludeExclude, setToggleIncludeExclude] = useState(inexObject && inexObject.type === "exclude" ?
        { value: "exclude", label: "exclude" } :
        { value: "include", label: "include" });
    const [includeFiles, setIncludeFiles] = useState(inexObject && inexObject.type === "include" ? inexObject.files.join(",") : "");
    const [excludeFiles, setExcludeFiles] = useState(inexObject && inexObject.type === "exclude" ? inexObject.files.join(",") : "");
    const [globbingEnabled, setGlobbingEnabled] = useState(inexObject ? inexObject.globbing_enabled : true);

    useEffect(() => {
        if (filterResults) {
            if (toggleIncludeExclude.value === "include") {
                onChangeHandler(JSON.stringify({
                    type: "include",
                    files: includeFiles.split(",").map(el => el.trim()),
                    globbing_enabled: globbingEnabled
                }));
            } else {
                onChangeHandler(JSON.stringify({
                    type: "exclude",
                    files: excludeFiles.split(",").map(el => el.trim()),
                    globbing_enabled: globbingEnabled
                }));
            }
        } else {
            onChangeHandler("");
        }
    }, [filterResults, toggleIncludeExclude, includeFiles, excludeFiles, onChangeHandler, globbingEnabled]);

    return (
        <React.Fragment>
            <div className="form-check">
                <input type="checkbox"
                    className="form-check-input"
                    checked={filterResults}
                    onChange={e => setFilterResults(e.target.checked)}
                    id="filterResults" />
                <label className="form-check-label" htmlFor="filterResults">{label ? label : "Filter results (e.g. to reduce the size of the results archive)?"}</label>
            </div>
            {filterResults && (
                <React.Fragment>
                    <div className="mt-3 mb-3">
                        <label htmlFor="toggleIncludeExclude">
                            Include or exclude files from results archive?
                        </label>
                        <Select
                            id="toggleIncludeExclude"
                            isClearable={false}
                            value={toggleIncludeExclude}
                            isSearchable={true}
                            onChange={selected => setToggleIncludeExclude(selected)}
                            options={[{
                                value: "include",
                                label: "include"
                            }, {
                                value: "exclude",
                                label: "exclude"
                            }]}
                        />
                    </div>
                    {toggleIncludeExclude.value === "include" ?
                        <div className="mb-3">
                            <label htmlFor="includeFiles" className="visually-hidden">
                                Files to include in results (optional, comma-separated)
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="includeFiles"
                                placeholder="Files to include in results (comma-separated, optional)"
                                autoComplete="on"
                                value={includeFiles}
                                onChange={e => setIncludeFiles(e.target.value)}
                            />
                        </div> :
                        <div className="mb-3">
                            <label htmlFor="excludeFiles" className="visually-hidden">
                                Files to exclude from results (optional, comma-separated)
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="excludeFiles"
                                placeholder="Files to exclude from results (comma-separated, optional)"
                                autoComplete="on"
                                value={excludeFiles}
                                onChange={e => setExcludeFiles(e.target.value)}
                            />
                        </div>
                    }
                <div className="form-check">
                    <input type="checkbox"
                        className="form-check-input"
                        checked={globbingEnabled}
                        onChange={e => setGlobbingEnabled(e.target.checked)}
                        id="globbingEnabled" />
                    <label className="form-check-label" htmlFor="globbingEnabled">Enable globbing (<kbd>*</kbd>/<kbd>?</kbd> wildcard characters)?</label>
                </div>
                </React.Fragment>)
            }
        </React.Fragment>
    );
};

export default InexJSONSelector;
