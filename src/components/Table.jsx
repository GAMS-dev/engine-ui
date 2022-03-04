import React, { useState, useEffect } from "react";
import moment from "moment";
import { ArrowUp, ArrowDown } from "react-feather";
import ClipLoader from "react-spinners/ClipLoader";
import Pagination from 'react-bootstrap/Pagination';
import { FormControl, Button, InputGroup } from "react-bootstrap";
import OverlayFilter from "./OverlayFilter";

const Table = props => {
  const { noDataMsg, isLoading, onChange, total } = props;

  const [currentPage, setCurrentPage] = useState(0);
  const [idFieldName, setIdFieldName] = useState(props.idFieldName);
  const [displayFields, setDisplayFields] = useState(props.displayFields);
  const [invalidPageNumber, setInvalidPageNumber] = useState(false);
  const [goToPage, setGoToPage] = useState(null);
  const [dataRaw, setDataRaw] = useState([...props.data]);
  const [data, setData] = useState([...props.data]);
  const [sortAsc, setSortAsc] = useState(props.sortedAsc === true);
  const [sortedCol, setSortedCol] = useState(props.sortedCol);
  const [refreshCount, setRefreshCount] = useState(0);

  const [currentFilters, setCurrentFilters] = useState({});

  const noRows = onChange == null ? data.length : total;
  const rowsPerPage = 10;
  const noPages = Math.ceil(noRows / rowsPerPage);

  useEffect(() => {
    setData([...props.data]);
    setDataRaw([...props.data]);
    setSortAsc(props.sortedAsc === true);
    setSortedCol(props.sortedCol);
    setCurrentFilters({});
    setIdFieldName(props.idFieldName);
    setDisplayFields(props.displayFields);
    setRefreshCount(prev => prev + 1);
  }, [props.data, props.sortedAsc, props.sortedCol, props.idFieldName,
  props.displayFields])

  useEffect(() => {
    if (onChange != null) {
      onChange(currentPage, sortedCol, sortAsc)
    }
  }, [currentPage, sortedCol, sortAsc, onChange])

  const gotoFirstPage = () => {
    setCurrentPage(0);
  }
  const gotoLastPage = () => {
    setCurrentPage(noPages - 1);
  }
  const gotoNextPage = () => {
    setCurrentPage(currentPage + 1);
  }
  const gotoPreviousPage = () => {
    setCurrentPage(currentPage - 1);
  }
  const updateCurrentPage = e => {
    const newPage = parseInt(e.target.text, 10);
    if (!isNaN(newPage)) {
      setCurrentPage(newPage - 1);
    }
  }
  const createRow = sub => {
    return <tr key={sub[idFieldName]}>
      {displayFields.map(e => (
        <td key={sub[idFieldName] + "_" + e.field}>
          {e.displayer(...e.field.split(",").map(subEl => sub[subEl]))}
        </td>
      ))}
    </tr>
  }
  const changeToPage = () => {
    if (invalidPageNumber || goToPage == null) {
      return;
    }
    setCurrentPage(goToPage - 1);
  }
  const sortCol = e => {
    if (!e.target.dataset.field) {
      return;
    }
    const field = e.target.dataset.field.split(",")[0];
    const sorter = e.target.dataset.sorter;
    const asc = (field === sortedCol && sortAsc) ? 1 : -1;
    if (sorter === "alphabetical") {
      setData(data.sort((a, b) => {
        if (a[field] == null) {
          return -asc;
        }
        if (b[field] == null) {
          return asc;
        }
        return -1 * a[field].localeCompare(b[field]) * asc;
      }));
    } else if (sorter === "numerical") {
      setData(data.sort((a, b) => {
        return (a[field] > b[field]) ? -asc : asc;
      }));
    } else if (sorter === "datetime") {
      setData(data.sort((a, b) => {
        if (a[field] == null) {
          return asc;
        }
        if (b[field] == null) {
          return -asc;
        }
        return (moment.utc(b[field]) - moment.utc(a[field])) * asc;
      }));
    } else if (sorter === "alphabetical-array") {
      setData(data.sort((a, b) => {
        if (a[field] == null) {
          return -asc;
        }
        if (b[field] == null) {
          return asc;
        }
        return -1 * a[field].join(",").localeCompare(b[field].join(",")) * asc;
      }));
    } else if (sorter === "alphabetical-object") {
      const firstKey = Object.keys(data[0][field])[0];
      setData(data.sort((a, b) => {
        if (a[field][firstKey] == null) {
          return -asc;
        }
        if (b[field][firstKey] == null) {
          return asc;
        }
        return -1 * a[field][firstKey].localeCompare(b[field][firstKey]) * asc;
      }));
    }
    setSortAsc(asc === -1);
    setSortedCol(field);
  }
  const filterCol = (colName, filterText) => {
    const currentFiltersTmp = {
      ...currentFilters
    }
    gotoFirstPage();
    if (currentFiltersTmp[colName] == null || currentFiltersTmp[colName].length < filterText.length) {
      setData(data
        .filter(dataTmp => dataTmp[colName] && dataTmp[colName].includes(filterText)));
      currentFiltersTmp[colName] = filterText;
    } else {
      if (filterText.length > 0) {
        currentFiltersTmp[colName] = filterText;
      } else {
        delete currentFiltersTmp[colName];
      }
      if (Object.keys(currentFiltersTmp).length === 0) {
        setData(dataRaw);
      } else {
        setData(dataRaw
          .filter(dataTmp =>
            Object.keys(currentFiltersTmp).every(colNameTmp => dataTmp[colNameTmp] && dataTmp[colNameTmp].includes(currentFiltersTmp[colNameTmp]))
          ));
      }
    }
    setCurrentFilters(currentFiltersTmp);
  }
  return (
    <>
      <table className="table summary-table table-striped">
        <thead className="thead-dark">
          <tr>
            {displayFields.map(e => {
              const colKey = e.field.split(",")[0];
              return <th scope="col" key={e.field}
                data-field={e.field}
                data-sorter={e.sorter}
                style={e.sorter == null ? {} : { cursor: "pointer" }}
                onClick={e.sorter == null ? undefined : sortCol}>
                {e.column}
                {(colKey === sortedCol) && (sortAsc ?
                  <ArrowUp width="12px" /> :
                  <ArrowDown width="12px" />)}
                {onChange == null && e.sorter != null && ["alphabetical"].includes(e.sorter) &&
                  <OverlayFilter
                    width="12px"
                    filterKey={colKey}
                    resetFilter={refreshCount}
                    onChange={filterCol} />}
              </th>;
            })}
          </tr>
        </thead>
        <tbody>
          {noRows && isLoading === false ? (onChange == null ?
            data.slice(currentPage * rowsPerPage, currentPage * rowsPerPage + rowsPerPage).map(createRow) :
            data.map(createRow)) :
            <tr>
              <td colSpan={displayFields.length}>{isLoading === true ? <ClipLoader /> : noDataMsg}</td>
            </tr>
          }
        </tbody>
      </table>
      {noRows > rowsPerPage &&
        <><small>{noRows.toLocaleString()} items</small>
          <Pagination>
            <Pagination.First disabled={currentPage === 0} onClick={gotoFirstPage} />
            <Pagination.Prev disabled={currentPage === 0} onClick={gotoPreviousPage} />
            {[...Array(noPages).keys()].map(i => {
              const pageDistance = (i === 0 || i === (noPages - 1)) ? 0 :
                Math.abs(currentPage - i);
              if (pageDistance === 2) {
                return <Pagination.Ellipsis key={'pe_' + i} disabled={true} />
              } else if (pageDistance > 1) {
                return undefined
              }
              return <Pagination.Item key={'p_' + i} active={currentPage === i} onClick={updateCurrentPage}>
                {++i}
              </Pagination.Item>
            })}
            <Pagination.Next disabled={currentPage === (noPages - 1)} onClick={gotoNextPage} />
            <Pagination.Last disabled={currentPage === (noPages - 1)} onClick={gotoLastPage} />
            {noRows > rowsPerPage * 4 &&
              <InputGroup className="ml-3" style={{ width: '150px' }}>
                <FormControl
                  placeholder="Page"
                  aria-label="Page"
                  aria-describedby="basic-addon2"
                  isInvalid={invalidPageNumber}
                  onKeyPress={(e) => {
                    if (e.code === "Enter") {
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
                <InputGroup.Append>
                  <Button variant="outline-secondary" onClick={changeToPage}>Go</Button>
                </InputGroup.Append>
              </InputGroup>}
          </Pagination></>}
    </>
  );
};
export default Table;
