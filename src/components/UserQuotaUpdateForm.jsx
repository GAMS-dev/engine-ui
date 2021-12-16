import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import UserQuotaSelector from "./UserQuotaSelector";

const UserQuotaUpdateForm = () => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { username } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [quotas, setQuotas] = useState({});
    const [quotaData, setQuotaData] = useState({});

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
                setQuotaData(res.data);
                if (quotasUser) {
                    setQuotas({
                        parallel: quotasUser.parallel_quota == null ? '' : quotasUser.parallel_quota,
                        disk: quotasUser.disk_quota == null ? '' : quotasUser.disk_quota,
                        volume: quotasUser.volume_quota == null ? '' : quotasUser.volume_quota
                    });
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
        if (quotas == null) {
            return;
        }
        setIsSubmitting(true);
        const quotaUpdateParams = {};
        let needUpdate = true;
        const quotasToDelete = [];

        if (quotas.parallel != null) {
            quotaUpdateParams["parallel_quota"] = quotas.parallel;
        } else {
            quotasToDelete.push("parallel_quota");
        }
        if (quotas.volume != null) {
            quotaUpdateParams["volume_quota"] = quotas.volume;
        } else {
            quotasToDelete.push("volume_quota");
        }
        if (quotas.disk != null) {
            quotaUpdateParams["disk_quota"] = quotas.disk;
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
                                <UserQuotaSelector
                                    quotas={quotas}
                                    quotaData={quotaData}
                                    userToEdit={username}
                                    setQuotas={setQuotas} />
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Update Quotas
                                </SubmitButton>
                            </div>
                            {userEdited && <Redirect to="/users" />}
                        </form>)}
            </div>
        </>
    );
}

export default UserQuotaUpdateForm;
