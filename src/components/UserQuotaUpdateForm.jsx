import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const UserQuotaUpdateForm = () => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { username } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [quotaParallel, setQuotaParallel] = useState('');
    const [validQuotaParallel, setValidQuotaParallel] = useState(true);
    const [quotaVolume, setQuotaVolume] = useState('');
    const [validQuotaVolume, setValidQuotaVolume] = useState(true);
    const [quotaDisk, setQuotaDisk] = useState('');
    const [validQuotaDisk, setValidQuotaDisk] = useState(true);

    const [userEdited, setUserEdited] = useState(false);

    useEffect(() => {
        const fetchRequiredData = async () => {
            try {
                const res = await axios
                    .get(`${server}/usage/quota`, {
                        params: { username: username }
                    });
                if (res.status !== 200) {
                    setErrorMsg("An error occurred while retrieving user quotas. Please try again later.");
                    return;
                }
                const quotasUser = res.data.filter(el => el.username === username)[0];
                if (quotasUser) {
                    setQuotaParallel(quotasUser.parallel_quota == null ? '' : quotasUser.parallel_quota);
                    setQuotaDisk(quotasUser.disk_quota == null ? '' : quotasUser.disk_quota / 1e6);
                    setQuotaVolume(quotasUser.volume_quota == null ? '' : quotasUser.volume_quota);
                } else if (res.data.length > 0) {
                    setSubmissionErrorMsg(`User inherits quotas from ${res.data[res.data.length - 1]["username"]}`);
                }
            }
            catch (err) {
                setErrorMsg(`Problems while while retrieving user quotas. Error message: ${getResponseError(err)}.`);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchRequiredData();
    }, [server, jwt, username]);

    const handleUserUpdateQuotaSubmission = async () => {
        if (!(validQuotaParallel && validQuotaVolume && validQuotaDisk)) {
            return;
        }
        setIsSubmitting(true);
        const quotaUpdateParams = {};
        let needUpdate = true;
        const quotasToDelete = [];

        if (quotaParallel) {
            quotaUpdateParams["parallel_quota"] = quotaParallel;
        } else {
            quotasToDelete.push("parallel_quota");
        }
        if (quotaVolume) {
            quotaUpdateParams["volume_quota"] = quotaVolume;
        } else {
            quotasToDelete.push("volume_quota");
        }
        if (quotaDisk) {
            quotaUpdateParams["disk_quota"] = quotaDisk * 1e6;
        } else {
            quotasToDelete.push("disk_quota");
        }

        try {
            let updateRequest;
            if (needUpdate) {
                quotaUpdateParams["username"] = username;
                updateRequest = axios.put(`${server}/usage/quota`, null, {
                    params: quotaUpdateParams
                });
            }
            const deleteRequests = quotasToDelete.map(quotaToDelete =>
                axios.delete(`${server}/usage/quota`, {
                    params: {
                        username: username,
                        field: quotaToDelete
                    }
                })
            );
            await Promise.all([updateRequest, deleteRequests]);

            setAlertMsg("success:User quotas successfully updated!");
            setUserEdited(true);
        }
        catch (err) {
            setIsSubmitting(false);
            setSubmissionErrorMsg(`An error occurred while updating user quotas. Error message: ${getResponseError(err)}.`);
        }
    };

    return (
        <>
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 className="h2">Edit Quotas of User: {username}</h1>
                </div>
                {isLoading ? <ClipLoader /> :
                    (errorMsg ?
                        <div className="invalid-feedback text-center" style={{ display: "block" }
                        } >
                            {errorMsg}
                        </div> :
                        <form
                            className="m-auto"
                            onSubmit={e => {
                                e.preventDefault();
                                handleUserUpdateQuotaSubmission();
                                return false;
                            }}
                        >
                            <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                                {submissionErrorMsg}
                            </div>
                            <fieldset disabled={isSubmitting}>
                                <div className="form-group">
                                    <label htmlFor="quotaParallel">
                                        Parallel quotas
                                </label>
                                    <input
                                        type="number"
                                        className={`form-control${validQuotaParallel ? '' : ' is-invalid'}`}
                                        id="quotaParallel"
                                        value={quotaParallel}
                                        onChange={e => {
                                            if (!e.target.value) {
                                                setValidQuotaParallel(true);
                                                setQuotaParallel('');
                                                return;
                                            }
                                            const val = parseFloat(e.target.value);
                                            if (isNaN(val) || !isFinite(val)) {
                                                setValidQuotaParallel(false);
                                                setQuotaParallel(val);
                                                return;
                                            }
                                            setValidQuotaParallel(true);
                                            setQuotaParallel(val);
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="quotaVolume">
                                        Volume quotas
                                </label>
                                    <input
                                        type="number"
                                        className={`form-control${validQuotaVolume ? '' : ' is-invalid'}`}
                                        id="quotaVolume"
                                        value={quotaVolume}
                                        onChange={e => {
                                            if (!e.target.value) {
                                                setValidQuotaVolume(true);
                                                setQuotaVolume('');
                                                return;
                                            }
                                            const val = parseFloat(e.target.value);
                                            if (isNaN(val) || !isFinite(val)) {
                                                setValidQuotaVolume(false);
                                                setQuotaVolume(val);
                                                return;
                                            }
                                            setValidQuotaVolume(true);
                                            setQuotaVolume(val);
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="quotaDisk">
                                        Disk space quotas (in MB)
                                </label>
                                    <input
                                        type="number"
                                        className={`form-control${validQuotaDisk ? '' : ' is-invalid'}`}
                                        id="quotaDisk"
                                        value={quotaDisk}
                                        onChange={e => {
                                            if (!e.target.value) {
                                                setValidQuotaDisk(true);
                                                setQuotaDisk('');
                                                return;
                                            }
                                            const val = parseInt(e.target.value);
                                            if (isNaN(val) || !isFinite(val)) {
                                                setValidQuotaDisk(false);
                                                setQuotaDisk(val);
                                                return;
                                            }
                                            setValidQuotaDisk(true);
                                            setQuotaDisk(val);
                                        }}
                                    />
                                </div>
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Update quotas
                            </SubmitButton>
                            </div>
                            {userEdited && <Redirect to="/users" />}
                        </form>)}
            </div>
        </>
    );
}

export default UserQuotaUpdateForm;
