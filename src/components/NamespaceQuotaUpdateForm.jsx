import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import { Alert } from "react-bootstrap";

const NamespaceQuotaUpdateForm = () => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { namespace } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [quota, setQuota] = useState('');
    const [diskUsed, setDiskUsed] = useState('');
    const [validQuota, setValidQuota] = useState(true);

    const [quotaEdited, setQuotaEdited] = useState(false);

    useEffect(() => {
        const fetchRequiredData = async () => {
            try {
                const res = await axios
                    .get(`${server}/namespaces/${encodeURIComponent(namespace)}/disk-quota`);
                if (res.data.disk_quota) {
                    setQuota(res.data.disk_quota / 1e6);
                }
                if (res.data.disk_use) {
                    setDiskUsed(res.data.disk_use / 1e6);
                }
            }
            catch (err) {
                setErrorMsg(`An error occurred while retrieving namespace quota. Error message: ${getResponseError(err)}.`);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchRequiredData();
    }, [server, jwt, namespace]);

    const handleUpdateQuotaSubmission = async () => {
        if (!validQuota) {
            return;
        }
        setIsSubmitting(true);

        try {
            if (quota) {
                await axios.put(`${server}/namespaces/${encodeURIComponent(namespace)}/disk-quota`, null, {
                    params: {
                        disk_quota: quota * 1e6
                    }
                });
            } else {
                await axios.delete(`${server}/namespaces/${encodeURIComponent(namespace)}/disk-quota`);
            }
            setAlertMsg("success:Namespace quota successfully updated!");
            setQuotaEdited(true);
        }
        catch (err) {
            setIsSubmitting(false);
            setSubmissionErrorMsg(`An error occurred while updating namespace quota. Error message: ${getResponseError(err)}.`);
        }
    };

    return (
        <>
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 className="h2">Edit Disk Space Quota of Namespace: {namespace}</h1>
                    {diskUsed && <Alert variant="info">Disk Space used: {Math.round(diskUsed * 100) / 100} MB</Alert>}
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
                                handleUpdateQuotaSubmission();
                                return false;
                            }}
                        >
                            <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                                {submissionErrorMsg}
                            </div>
                            <fieldset disabled={isSubmitting}>
                                <div className="mb-3">
                                    <label htmlFor="quotaDisk">
                                        Disk Space Quota (in MB)
                                    </label>
                                    <input
                                        type="number"
                                        className={`form-control${validQuota ? '' : ' is-invalid'}`}
                                        id="quotaDisk"
                                        value={quota}
                                        onChange={e => {
                                            if (!e.target.value) {
                                                setValidQuota(true);
                                                setQuota('');
                                                return;
                                            }
                                            const val = parseInt(e.target.value);
                                            if (isNaN(val) || !isFinite(val)) {
                                                setValidQuota(false);
                                                setQuota(val);
                                                return;
                                            }
                                            setValidQuota(true);
                                            setQuota(val);
                                        }}
                                    />
                                </div>
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Update Quota
                                </SubmitButton>
                            </div>
                            {quotaEdited && <Navigate to={`/models/${encodeURIComponent(namespace)}`} />}
                        </form>)}
            </div>
        </>
    );
}

export default NamespaceQuotaUpdateForm;
