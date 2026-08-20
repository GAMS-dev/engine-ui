import { useState, useEffect, useContext } from 'react';
import moment from 'moment';
import { ArrowUp, ArrowDown } from 'lucide-react';
import ClipLoader from './ThemedClipLoader';
import { Pagination, InputGroup, Button, Form } from 'react-bootstrap';
import { FormControl } from 'react-bootstrap';
import OverlayFilter from './OverlayFilter';
import { getRandomInt } from '../util/util';
import UserSettingsContext from '../contexts/UserSettingsContext';
import { availableTablePageLengths } from '../util/constants';

const Table = ({
  noDataMsg,
  isLoading,
  onChange,
  total,
  resetPageNumber,
  idFieldName: initialIdFieldName,
  displayFields: initialDisplayFields,
  data: initialData,
  sortedAsc,
  sortedCol: initialSortedCol,
  rowsPerPage: initialRowsPerPage,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [idFieldName, setIdFieldName] = useState(initialIdFieldName);
  const [displayFields, setDisplayFields] = useState(initialDisplayFields);
  const [invalidPageNumber, setInvalidPageNumber] = useState(false);
  const [goToPage, setGoToPage] = useState(null);
  const [dataRaw, setDataRaw] = useState([...initialData]);
  const [data, setData] = useState([...initialData]);
  const [sortAsc, setSortAsc] = useState(sortedAsc === true);
  const [sortedCol, setSortedCol] = useState(initialSortedCol);
  const [refreshCount, setRefreshCount] = useState(0);

  const [currentFilters, setCurrentFilters] = useState({});

  const [userSettings] = useContext(UserSettingsContext);
  const [noRows, setNoRows] = useState(
    onChange == null ? initialData.length : total,
  );
  const [rowsPerPage, setRowsPerPage] = useState(
    initialRowsPerPage == null
      ? parseInt(userSettings.tablePageLength, 10)
      : initialRowsPerPage,
  );
  const [noPages, setNoPages] = useState(Math.ceil(noRows / rowsPerPage));

  useEffect(() => {
    if (resetPageNumber === true) {
      setCurrentPage(0);
    }
  }, [resetPageNumber]);

  useEffect(() => {
    setData([...initialData]);
    setDataRaw([...initialData]);
    const newNoRows = onChange == null ? initialData.length : total;
    setNoRows(newNoRows);
    const newRowsPerPage = initialRowsPerPage
      ? initialRowsPerPage
      : parseInt(userSettings.tablePageLength, 10);
    const newNoPages = Math.ceil(newNoRows / newRowsPerPage);
    setRowsPerPage(newRowsPerPage);
    setNoPages(newNoPages);
    setCurrentPage((current) => Math.max(0, Math.min(current, newNoPages - 1)));
    setSortAsc(sortedAsc === true);
    setSortedCol(initialSortedCol);
    setCurrentFilters({});
    setIdFieldName(initialIdFieldName);
    setDisplayFields(initialDisplayFields);
    setRefreshCount((prev) => prev + 1);
  }, [
    initialData,
    sortedAsc,
    initialSortedCol,
    initialIdFieldName,
    initialDisplayFields,
    initialRowsPerPage,
    onChange,
    total,
    userSettings,
  ]);

  useEffect(() => {
    if (onChange != null) {
      onChange(currentPage, sortedCol, sortAsc, rowsPerPage);
    }
  }, [currentPage, sortedCol, sortAsc, onChange, rowsPerPage]);

  const gotoFirstPage = () => {
    setCurrentPage(0);
  };
  const gotoLastPage = () => {
    setCurrentPage(noPages - 1);
  };
  const gotoNextPage = () => {
    setCurrentPage(currentPage + 1);
  };
  const gotoPreviousPage = () => {
    setCurrentPage(currentPage - 1);
  };
  const updateCurrentPage = (e) => {
    const newPage = parseInt(e.target.text, 10);
    if (!isNaN(newPage)) {
      setCurrentPage(newPage - 1);
    }
  };
  const createRow = (sub) => {
    return (
      <tr key={sub[idFieldName]}>
        {displayFields.map((e) => (
          <td key={sub[idFieldName] + '_' + e.field}>
            {e.displayer(...e.field.split(',').map((subEl) => sub[subEl]))}
          </td>
        ))}
      </tr>
    );
  };
  const changeToPage = () => {
    if (invalidPageNumber || goToPage == null) {
      return;
    }
    setCurrentPage(goToPage - 1);
  };
  const sortCol = (e) => {
    if (!e.target.dataset.field || data.length === 0) {
      return;
    }
    const field = e.target.dataset.field.split(',')[0];
    const sorter = e.target.dataset.sorter;
    const asc = field === sortedCol && sortAsc ? 1 : -1;
    if (sorter === 'alphabetical') {
      setData(
        [...data].sort((a, b) => {
          if (a[field] == null) {
            return -asc;
          }
          if (b[field] == null) {
            return asc;
          }
          return -1 * a[field].localeCompare(b[field]) * asc;
        }),
      );
    } else if (sorter === 'numerical') {
      setData(
        [...data].sort((a, b) => {
          return a[field] > b[field] ? -asc : asc;
        }),
      );
    } else if (sorter === 'datetime') {
      setData(
        [...data].sort((a, b) => {
          if (a[field] == null) {
            return asc;
          }
          if (b[field] == null) {
            return -asc;
          }
          return (moment.utc(b[field]) - moment.utc(a[field])) * asc;
        }),
      );
    } else if (sorter === 'alphabetical-array') {
      setData(
        [...data].sort((a, b) => {
          if (a[field] == null) {
            return -asc;
          }
          if (b[field] == null) {
            return asc;
          }
          return (
            -1 * a[field].join(',').localeCompare(b[field].join(',')) * asc
          );
        }),
      );
    } else if (sorter === 'alphabetical-object') {
      const firstKey = Object.keys(data[0][field])[0];
      setData(
        [...data].sort((a, b) => {
          if (a[field][firstKey] == null) {
            return -asc;
          }
          if (b[field][firstKey] == null) {
            return asc;
          }
          return (
            -1 * a[field][firstKey].localeCompare(b[field][firstKey]) * asc
          );
        }),
      );
    }
    setSortAsc(asc === -1);
    setSortedCol(field);
  };
  const filterCol = (colName, filterText) => {
    const currentFiltersTmp = {
      ...currentFilters,
    };
    gotoFirstPage();
    let newDataTmp;
    if (
      currentFiltersTmp[colName] == null ||
      filterText.startsWith(currentFiltersTmp[colName])
    ) {
      const filterTextLower = filterText.toLowerCase();
      newDataTmp = data.filter(
        (dataTmp) =>
          dataTmp[colName] &&
          dataTmp[colName].toLowerCase().includes(filterTextLower),
      );
      currentFiltersTmp[colName] = filterText;
    } else {
      if (filterText.length > 0) {
        currentFiltersTmp[colName] = filterText.toLowerCase();
      } else {
        delete currentFiltersTmp[colName];
      }
      if (Object.keys(currentFiltersTmp).length === 0) {
        newDataTmp = dataRaw;
      } else {
        newDataTmp = dataRaw.filter((dataTmp) =>
          Object.keys(currentFiltersTmp).every(
            (colNameTmp) =>
              dataTmp[colNameTmp] &&
              dataTmp[colNameTmp]
                .toLowerCase()
                .includes(currentFiltersTmp[colNameTmp]),
          ),
        );
      }
    }
    setCurrentFilters(currentFiltersTmp);
    const newNoRows = newDataTmp.length;
    setNoRows(newNoRows);
    const newNoPages = Math.ceil(newNoRows / rowsPerPage);
    setNoPages(newNoPages);
    setData(newDataTmp);
  };
  return (
    <>
      <div className="table-card">
        <table className="table summary-table table-striped table-hover">
          <thead className="table-header-primary">
            <tr>
              {displayFields.map((e) => {
                const colKey = e.field.split(',')[0];
                return (
                  <th
                    scope="col"
                    key={e.field}
                    data-field={e.field}
                    data-sorter={e.sorter}
                    style={e.sorter == null ? {} : { cursor: 'pointer' }}
                    onClick={e.sorter == null ? undefined : sortCol}
                  >
                    {e.column}
                    {colKey === sortedCol &&
                      (sortAsc ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      ))}
                    {onChange == null &&
                      e.sorter != null &&
                      ['alphabetical'].includes(e.sorter) && (
                        <OverlayFilter
                          width="12px"
                          filterKey={colKey}
                          resetFilter={refreshCount}
                          onChange={filterCol}
                        />
                      )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {noRows && isLoading === false ? (
              onChange == null ? (
                data
                  .slice(
                    currentPage * rowsPerPage,
                    currentPage * rowsPerPage + rowsPerPage,
                  )
                  .map(createRow)
              ) : (
                data.map(createRow)
              )
            ) : (
              <tr>
                <td colSpan={displayFields.length}>
                  {isLoading === true ? <ClipLoader /> : noDataMsg}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {noRows > 0 && (
        <>
          <small>
            {currentPage * rowsPerPage + 1}-
            {Math.min((currentPage + 1) * rowsPerPage, noRows)} of{' '}
            {noRows.toLocaleString()}
          </small>
          <Pagination>
            <Pagination.First
              disabled={currentPage === 0}
              onClick={gotoFirstPage}
            />
            <Pagination.Prev
              disabled={currentPage === 0}
              onClick={gotoPreviousPage}
            />
            {[...Array(noPages).keys()].map((i) => {
              const pageDistance =
                i === 0 || i === noPages - 1 ? 0 : Math.abs(currentPage - i);
              if (pageDistance === 2) {
                return <Pagination.Ellipsis key={'pe_' + i} disabled={true} />;
              } else if (pageDistance > 1) {
                return undefined;
              }
              return (
                <Pagination.Item
                  key={'p_' + i}
                  active={currentPage === i}
                  onClick={updateCurrentPage}
                >
                  {(i + 1).toLocaleString()}
                </Pagination.Item>
              );
            })}
            <Pagination.Next
              disabled={currentPage === noPages - 1}
              onClick={gotoNextPage}
            />
            <Pagination.Last
              disabled={currentPage === noPages - 1}
              onClick={gotoLastPage}
            />
            {noRows > rowsPerPage * 4 && (
              <InputGroup className="ms-3" style={{ width: '150px' }}>
                <FormControl
                  id="page-input"
                  name="goToPageNumber"
                  placeholder="Page"
                  aria-label="Page"
                  aria-describedby="basic-addon2"
                  isInvalid={invalidPageNumber}
                  onKeyPress={(e) => {
                    if (e.code === 'Enter') {
                      changeToPage();
                    }
                  }}
                  onChange={(e) => {
                    const page = parseInt(e.target.value);
                    if (isNaN(page) || page < 1 || page > noPages) {
                      setInvalidPageNumber(true);
                      return;
                    }
                    setGoToPage(page);
                    setInvalidPageNumber(false);
                  }}
                />
                <Button variant="outline-secondary" onClick={changeToPage}>
                  Go
                </Button>
              </InputGroup>
            )}
            <li>
              <Form.Group
                controlId={`table${getRandomInt(100000)}_rpp`}
                className="d-flex ms-3 text-nowrap pt-1"
              >
                <Form.Label>Rows per page</Form.Label>
                <Form.Select
                  size="sm"
                  className="ms-1"
                  onChange={(e) => {
                    const newNoRows = parseInt(e.target.value, 10);
                    setRowsPerPage(newNoRows);
                    setNoPages(Math.ceil(noRows / newNoRows));
                  }}
                  value={rowsPerPage.toString()}
                >
                  {availableTablePageLengths.map((rpp, idx) => (
                    <option key={`rpp_${idx}`} value={rpp.name}>
                      {rpp.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </li>
          </Pagination>
        </>
      )}
    </>
  );
};
export default Table;
