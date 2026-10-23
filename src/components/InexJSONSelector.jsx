import React, { useState, useEffect } from 'react';
import Select from './ThemedSelect';

export const EMPTY_INEX_ERROR =
  'Enter at least one file pattern or uncheck the filter.';

export const InexJSONSelector = ({
  onChangeHandler,
  label,
  inexObject,
  idPrefix = '',
  includeOnly = false,
  filesPlaceholder,
}) => {
  const [filterResults, setFilterResults] = useState(inexObject ? true : false);
  const [toggleIncludeExclude, setToggleIncludeExclude] = useState(
    inexObject && inexObject.type === 'exclude' && !includeOnly
      ? { value: 'exclude', label: 'exclude' }
      : { value: 'include', label: 'include' },
  );
  const [includeFiles, setIncludeFiles] = useState(
    inexObject && inexObject.type === 'include'
      ? inexObject.files.join(',')
      : '',
  );
  const [excludeFiles, setExcludeFiles] = useState(
    inexObject && inexObject.type === 'exclude'
      ? inexObject.files.join(',')
      : '',
  );
  const [globbingEnabled, setGlobbingEnabled] = useState(
    inexObject ? inexObject.globbing_enabled : true,
  );

  useEffect(() => {
    if (!filterResults) {
      onChangeHandler('');
      return;
    }
    const type = toggleIncludeExclude.value;
    const files = (type === 'include' ? includeFiles : excludeFiles)
      .split(',')
      .map((el) => el.trim())
      .filter(Boolean);
    // null signals a filter without patterns, which forms must reject
    onChangeHandler(
      files.length
        ? JSON.stringify({ type, files, globbing_enabled: globbingEnabled })
        : null,
    );
  }, [
    filterResults,
    toggleIncludeExclude,
    includeFiles,
    excludeFiles,
    onChangeHandler,
    globbingEnabled,
  ]);

  return (
    <React.Fragment>
      <div className="form-check">
        <input
          type="checkbox"
          className="form-check-input"
          checked={filterResults}
          onChange={(e) => setFilterResults(e.target.checked)}
          id={`${idPrefix}filterResults`}
        />
        <label
          className="form-check-label"
          htmlFor={`${idPrefix}filterResults`}
        >
          {label
            ? label
            : 'Filter results (e.g. to reduce the size of the results archive)?'}
        </label>
      </div>
      {filterResults && (
        <React.Fragment>
          {!includeOnly && (
            <div className="mt-3 mb-3">
              <label htmlFor={`${idPrefix}toggleIncludeExclude`}>
                Include or exclude files from results archive?
              </label>
              <Select
                inputId={`${idPrefix}toggleIncludeExclude`}
                isClearable={false}
                value={toggleIncludeExclude}
                isSearchable={true}
                onChange={(selected) => setToggleIncludeExclude(selected)}
                options={[
                  {
                    value: 'include',
                    label: 'include',
                  },
                  {
                    value: 'exclude',
                    label: 'exclude',
                  },
                ]}
              />
            </div>
          )}
          {toggleIncludeExclude.value === 'include' ? (
            <div className="mb-3">
              <label
                htmlFor={`${idPrefix}includeFiles`}
                className="visually-hidden"
              >
                {filesPlaceholder ??
                  'Files to include in results (comma-separated)'}
              </label>
              <input
                type="text"
                className="form-control"
                id={`${idPrefix}includeFiles`}
                placeholder={
                  filesPlaceholder ??
                  'Files to include in results (comma-separated)'
                }
                autoComplete="on"
                value={includeFiles}
                onChange={(e) => setIncludeFiles(e.target.value)}
              />
            </div>
          ) : (
            <div className="mb-3">
              <label
                htmlFor={`${idPrefix}excludeFiles`}
                className="visually-hidden"
              >
                Files to exclude from results (comma-separated)
              </label>
              <input
                type="text"
                className="form-control"
                id={`${idPrefix}excludeFiles`}
                placeholder="Files to exclude from results (comma-separated)"
                autoComplete="on"
                value={excludeFiles}
                onChange={(e) => setExcludeFiles(e.target.value)}
              />
            </div>
          )}
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              checked={globbingEnabled}
              onChange={(e) => setGlobbingEnabled(e.target.checked)}
              id={`${idPrefix}globbingEnabled`}
            />
            <label
              className="form-check-label"
              htmlFor={`${idPrefix}globbingEnabled`}
            >
              Enable globbing (<kbd>*</kbd>/<kbd>?</kbd> wildcard characters)?
            </label>
          </div>
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default InexJSONSelector;
