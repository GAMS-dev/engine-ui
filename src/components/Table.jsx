import React, { useState, useEffect } from "react";
import moment from "moment";
import { ArrowUp, ArrowDown } from "react-feather";
import ClipLoader from "react-spinners/ClipLoader";
import Pagination from 'react-bootstrap/Pagination';

const Table = props => {
  const { displayFields, noDataMsg, idFieldName, isLoading, onChange, total } = props;

  const [currentPage, setCurrentPage] = useState(0);
  const [data, setData] = useState([...props.data]);
  const [sortAsc, setSortAsc] = useState(props.sortedAsc === true);
  const [sortedCol, setSortedCol] = useState(props.sortedCol);

  const noRows = onChange == null ? data.length : total;
  const rowsPerPage = 10;
  const noPages = Math.ceil(noRows / rowsPerPage);

  useEffect(() => {
    setData([...props.data]);
    setSortAsc(props.sortedAsc === true);
    setSortedCol(props.sortedCol)
  }, [props.data, props.sortedAsc, props.sortedCol])

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
  return (
    <div className="table-responsive">
      <table className="table summary-table table-striped">
        <thead className="thead-dark">
          <tr>
            {displayFields.map(e => (
              <th scope="col" key={e.field}
                data-field={e.field}
                data-sorter={e.sorter}
                style={e.sorter == null ? {} : { cursor: "pointer" }}
                onClick={e.sorter == null ? undefined : sortCol}>
                {e.column}
                {(e.field.split(",")[0] === sortedCol) && (sortAsc ?
                  <ArrowUp width="12px" /> :
                  <ArrowDown width="12px" />)}
              </th>
            ))}
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
                return <Pagination.Ellipsis key={i} disabled={true} />
              } else if (pageDistance > 1) {
                return undefined
              }
              return <Pagination.Item key={i} active={currentPage === i} onClick={updateCurrentPage}>
                {++i}
              </Pagination.Item>
            })}
            <Pagination.Next disabled={currentPage === (noPages - 1)} onClick={gotoNextPage} />
            <Pagination.Last disabled={currentPage === (noPages - 1)} onClick={gotoLastPage} />
          </Pagination></>}
    </div>
  );
};
export default Table;
