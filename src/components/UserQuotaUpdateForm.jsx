import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
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
    const { userToEdit } = useParams();

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
                        params: { username: userToEdit }
                    });
                setQuotaData(res.data);
                const quotasUser = res.data.filter(el => el.username === userToEdit)[0];
                if (quotasUser) {
                    setQuotas({
                        parallel: quotasUser.parallel_quota,
                        disk: quotasUser.disk_quota,
                        volume: quotasUser.volume_quota
                    });
                }
            }
            catch (err) {
                setErrorMsg(`Problems while retrieving user quotas. Error message: ${getResponseError(err)}.`);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchRequiredData();
    }, [server, jwt, userToEdit]);

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
                quotaUpdateParams["username"] = userToEdit;
                updateRequest = axios.put(`${server}/usage/quota`, null, {
                    params: quotaUpdateParams
                });
            }
            const deleteRequests = quotasToDelete.map(quotaToDelete =>
                axios.delete(`${server}/usage/quota`, {
                    params: {
                        username: userToEdit,
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
                                    userToEdit={userToEdit}
                                    setQuotas={setQuotas} />
                            </fieldset>
                            <div className="mt-3">
                                <SubmitButton isSubmitting={isSubmitting}>
                                    Update Quotas
                                </SubmitButton>
                            </div>
                            {userEdited && <Navigate to={`/users/${userToEdit}`} />}
                        </form>)}
            </div>
        </>
    );
}

export default UserQuotaUpdateForm;
