import React, { useEffect, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Send } from "react-feather";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import moment from "moment";
import axios from "axios";
import Table from "./Table";
import { getResponseError, formatFileSize, calcRemainingQuota } from "./util";
import TimeDisplay from "./TimeDisplay";
import SubmitButton from "./SubmitButton";
import CleanupActionsButtonGroup from "./CleanupActionsButtonGroup";
import { ClipLoader } from "react-spinners";

const Cleanup = () => {

    const [datasets, setDatasets] = useState([]);
    const [dataToRemove, setDataToRemove] = useState([]);
    const [deleteDataThreshold, setDeleteDataThreshold] = useState(0);
    const [deletedUsersOnly, setDeletedUsersOnly] = useState(false);
    const [totalFileSize, setTotalFileSize] = useState(0);
    const [fileSizeQuota, setFileSizeQuota] = useState(-1);
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
    const [showHousekeepingDialog, setShowHousekeepingDialog] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortedCol, setSortedCol] = useState("upload_date");
    const [sortAsc, setSortAsc] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ jwt, server, username }] = useContext(AuthContext);
    const [displayFields] = useState([
        {
            field: "token,type",
            column: "Job token",
            displayer: (name, type) => <>
                {type === "hypercube_result" ? <Link to={`/jobs/hc:${name}`}>{name}
                    <sup>
                        <span className="badge rounded-pill bg-primary ms-1">HC</span>
                    </sup></Link> :
                    <Link to={`/jobs/${name}`}>{name}</Link>}
            </>
        },
        {
            field: "username",
            column: "User",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "namespace",
            column: "Namespace",
            sorter: "alphabetical",
            displayer: String
        },
        {
            field: "length",
            column: "Size",
            sorter: "numerical",
            displayer: size => size >= 1e6 ? `${(size / 1e6).toFixed(2)}MB` : `${(size / 1e3).toFixed(2)}KB`
        },
        {
            field: "upload_date",
            column: "Upload date",
            sorter: "datetime",
            displayer: e => <TimeDisplay time={e} />
        },
        {
            field: "id,type,username",
            column: "Actions",
            displayer: (token, type, username) => <CleanupActionsButtonGroup
                token={token}
                username={username}
                type={type}
                setDataToRemove={setDataToRemove}
                setShowDeleteConfirmDialog={setShowDeleteConfirmDialog} />
        }
    ]);
    useEffect(() => {
        const cancelTokenSource = axios.CancelToken.source();
        const fetchVolumeQuota = async () => {
            try {
                setFileSizeQuota(-1);
                const result = await axios({
                    url: `${server}/usage/quota`,
                    method: "GET",
                    params: { username: username },
                    cancelToken: cancelTokenSource.token
                });
                if (result.data && result.data.length) {
                    const quotaRemaining = calcRemainingQuota(result.data);
                    setFileSizeQuota(quotaRemaining.disk);
                } else {
                    setFileSizeQuota(Infinity);
                }
            }
            catch (err) {
                if (!axios.isCancel(err)) {
                    setAlertMsg(`Problems fetching volume quota. Error message: ${getResponseError(err)}`);
                }
            }
        }
        fetchVolumeQuota();
        return () => {
            cancelTokenSource.cancel()
        }
    }, [jwt, server, username, refresh, setAlertMsg]);

    useEffect(() => {
        setIsLoading(true);
        axios
            .get(`${server}/cleanup/results`, {
                params: {
                    per_page: rowsPerPage, page: currentPage,
                    order_by: sortedCol, order_asc: sortAsc
                },
                headers: { "X-Fields": displayFields.map(e => e.field).join(", ") }
            })
            .then(res => {
                if (res.status !== 200) {
                    setAlertMsg("Problems fetching cleanup information.");
                    setIsLoading(false);
                    return;
                }
                setTotalFileSize(res.data.total_length);
                setTotal(res.data.count);
                setDatasets(res.data.results.map(el => {
                    const newData = el;
                    newData.id = el.token;
                    newData.username = el.user.deleted ? "" : el.user.username;
                    return newData;
                }));
                setIsLoading(false);
            })
            .catch(err => {
                setAlertMsg(`Problems fetching cleanup information. Error message: ${getResponseError(err)}`);
                setIsLoading(false);
            });
    }, [jwt, server, refresh, displayFields, setAlertMsg, currentPage, sortedCol, sortAsc, rowsPerPage]);

    const handleCloseDeleteConfirmDialog = () => {
        setSubmissionErrorMsg("");
        setShowDeleteConfirmDialog(false);
    }
    const handleCloseHousekeepingDialog = () => {
        setSubmissionErrorMsg("");
        setShowHousekeepingDialog(false);
    }
    const updateDeleteDataThreshold = e => {
        setDeleteDataThreshold(e.target.value);
    }
    const getTokensToDelete = async (daysThresholdTmp, deletedUsersOnly) => {
        let results_to_remove = await axios.get(`${server}/cleanup/results`, {
            params: {
                to_datetime: moment().subtract(daysThresholdTmp, 'days').toISOString()
            }
        });
        results_to_remove = results_to_remove.data.results;
        if (deletedUsersOnly) {
            results_to_remove = results_to_remove.filter(el => (el.user.deleted === true));
        }
        return results_to_remove.map(el => ({ token: el.token, type: el.type }));
    }
    const deleteData = async () => {
        setIsSubmitting(true);
        setSubmissionErrorMsg("");
        let tokensToRemove;
        if (showHousekeepingDialog) {
            const daysThresholdTmp = parseInt(deleteDataThreshold, 10);
            if (isNaN(daysThresholdTmp)) {
                setSubmissionErrorMsg("The number of days you entered is not a valid integer!");
                setIsSubmitting(false);
                return;
            }
            try {
                tokensToRemove = await getTokensToDelete(daysThresholdTmp, deletedUsersOnly);
            } catch (err) {
                setSubmissionErrorMsg(`Problems deleting dataset. Error message: ${getResponseError(err)}`);
                setIsSubmitting(false);
                return;
            }
        } else {
            tokensToRemove = dataToRemove;

        }
        if (tokensToRemove.length === 0) {
            setSubmissionErrorMsg("Nothing to remove");
            setIsSubmitting(false);
            return;
        }
        for (let i = 0; i < Math.ceil(tokensToRemove.length / 1000); i += 1) {
            // send batches of 1000
            try {
                const tokensToRemoveTmp = tokensToRemove.splice(0, 1000).map(el =>
                    `${el.type === "hypercube_result" ? "hypercube_token" : "token"}=${el.token}`).join("&");
                await axios.delete(`${server}/cleanup/results`,
                    {
                        data: tokensToRemoveTmp,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );
            } catch (err) {
                setSubmissionErrorMsg(`Problems deleting dataset. Error message: ${getResponseError(err)}`);
                setIsSubmitting(false);
                return;
            }
        }
        setRefresh(refreshCnt => ({
            refresh: refreshCnt + 1
        }));
        setIsSubmitting(false);

        if (showDeleteConfirmDialog) {
            setShowDeleteConfirmDialog(false);
        } else {
            setShowHousekeepingDialog(false);
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">Cleanup</h1>
                <div className="btn-toolbar mb-2 mb-md-0">
                    <div className="btn-group me-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowHousekeepingDialog(true)}>
                            Run Housekeeping
                            <Send width="12px" className="ms-2" />
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => {
                                setRefresh(refresh + 1);
                            }}
                        >
                            Refresh
                            <RefreshCw width="12px" className="ms-2" />
                        </button>
                    </div>
                </div>
            </div>
            <small>
                Total File Size: {formatFileSize(totalFileSize)} {fileSizeQuota === -1 ? <ClipLoader size={12} /> : (isFinite(fileSizeQuota) ? `/${formatFileSize(fileSizeQuota)}` : '')}
            </small>
            <Table data={datasets}
                noDataMsg="No Datasets found"
                displayFields={displayFields}
                sortedAsc={sortAsc}
                rowsPerPage={rowsPerPage}
                total={total}
                onChange={(currentPage, sortedCol, sortAsc, rowsPerPage) => {
                    setCurrentPage(currentPage + 1)
                    setSortedCol(sortedCol)
                    setSortAsc(sortAsc)
                    setRowsPerPage(rowsPerPage)
                }}
                isLoading={isLoading}
                sortedCol={sortedCol}
                idFieldName="token" />
            <Modal show={showHousekeepingDialog} onHide={handleCloseHousekeepingDialog}>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        deleteData();
                        return false;
                    }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Run Housekeeping</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <div className="mb-3">
                                <label htmlFor="deleteDataThreshold">
                                    Delete all data older than ... days
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    id="deleteDataThreshold"
                                    min="0"
                                    value={deleteDataThreshold}
                                    onChange={updateDeleteDataThreshold}
                                    required
                                />
                                <div className="form-check mt-3">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={deletedUsersOnly}
                                        onChange={e => setDeletedUsersOnly(e.target.checked)}
                                        id="deletedUsersOnly"
                                        disabled={datasets.filter(el => el.deleted === true).length > 0}
                                    />
                                    <label className="form-check-label" htmlFor="deletedUsersOnly">Remove only data from deleted users?</label>
                                </div>
                            </div>
                        </fieldset>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseHousekeepingDialog}>
                            Cancel
                        </Button>
                        <SubmitButton isSubmitting={isSubmitting} className="btn-primary">
                            Submit
                        </SubmitButton>
                    </Modal.Footer>
                </form>
            </Modal>
            <Modal show={showDeleteConfirmDialog} onHide={handleCloseDeleteConfirmDialog}>
                <Modal.Header closeButton>
                    <Modal.Title>Please Confirm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="invalid-feedback" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                        {submissionErrorMsg}
                    </div>
                    Are you sure you want to delete the data of job with token: <code>{dataToRemove.length ? dataToRemove[0].token : ''}</code> (user: <code>{dataToRemove.length ? dataToRemove[0].username : ''}</code>) data? This cannot be undone!
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDeleteConfirmDialog}>
                        Cancel
                    </Button>
                    <SubmitButton isSubmitting={isSubmitting} onClick={deleteData} className="btn-primary">
                        Delete
                    </SubmitButton>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Cleanup;
