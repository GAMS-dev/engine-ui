import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";
import UserQuotaSelector from "./UserQuotaSelector";
import { UserLink } from "./UserLink";

const UserQuotaUpdateForm = () => {
    const [{ jwt, server }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { userToEdit } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [inheritQuotas, setInheritQuotas] = useState(true);
    const [quotas, setQuotas] = useState({});
    const [quotaData, setQuotaData] = useState({});
    const [quotaInheritedFrom, setQuotaInheritedFrom] = useState("");
    const [quotaFromInviter, setQuotaFromInviter] = useState({});

    const [userEdited, setUserEdited] = useState(false);

    useEffect(() => {
        const fetchInviterName = async () => {
            try {
                const userInfoReq = await axios.get(`${server}/users/`, {
                    params: {
                        username: userToEdit,
                        everyone: true,
                        filter: "deleted=false"
                    }
                });
                setQuotaInheritedFrom(userInfoReq.data[0].inviter_name)
            } catch (err) {
                setErrorMsg(`Problems while retrieving user info. Error message: ${getResponseError(err)}.`);
            }
        }
        setInheritQuotas(false);
        const fetchRequiredData = async () => {
            try {
                const res = await axios
                    .get(`${server}/usage/quota`, {
                        params: { username: userToEdit }
                    });
                const quotasUser = res.data.filter(el => el.username === userToEdit)[0];
                setQuotaData(res.data);
                // userToEdit already has a quota
                if (quotasUser) {
                    // inviters are listed -> inviter has a quota assigned
                    if (res.data.length > 1) {
                        let quotaInviterTmp = res.data.slice(-1)[0]
                        setQuotaInheritedFrom(quotaInviterTmp.username);
                        quotaInviterTmp = {
                            parallel: quotaInviterTmp.parallel_quota == null ? '' : quotaInviterTmp.parallel_quota,
                            disk: quotaInviterTmp.disk_quota == null ? '' : quotaInviterTmp.disk_quota,
                            volume: quotaInviterTmp.volume_quota == null ? '' : quotaInviterTmp.volume_quota
                        };
                        setQuotaFromInviter(quotaInviterTmp);
                        if (quotasUser.parallel_quota == null && quotasUser.disk_quota == null
                            && quotasUser.volume_quota == null) {
                            setInheritQuotas(true);
                            setQuotas(quotaInviterTmp);
                        } else {
                            setQuotas({
                                parallel: quotasUser.parallel_quota == null ? '' : quotasUser.parallel_quota,
                                disk: quotasUser.disk_quota == null ? '' : quotasUser.disk_quota,
                                volume: quotasUser.volume_quota == null ? '' : quotasUser.volume_quota
                            });
                        }
                    }
                    // Only on entry in return, which is for userToEdit -> inviter has no quota
                    else {
                        setQuotas({
                            parallel: quotasUser.parallel_quota == null ? '' : quotasUser.parallel_quota,
                            disk: quotasUser.disk_quota == null ? '' : quotasUser.disk_quota,
                            volume: quotasUser.volume_quota == null ? '' : quotasUser.volume_quota
                        });
                        setQuotaFromInviter({ parallel: Infinity, volume: Infinity, disk: Infinity });
                        fetchInviterName();
                    }
                }
                // userToEdit is not listed
                else {
                    // user not yet has quota but inviter has
                    if (res.data.length > 0) {
                        setQuotas({ parallel: 0, volume: 0, disk: 0 });
                        let quotaInviterTmp = res.data.slice(-1)[0]
                        setQuotaInheritedFrom(quotaInviterTmp.username);
                        quotaInviterTmp = {
                            parallel: quotaInviterTmp.parallel_quota == null ? '' : quotaInviterTmp.parallel_quota,
                            disk: quotaInviterTmp.disk_quota == null ? '' : quotaInviterTmp.disk_quota,
                            volume: quotaInviterTmp.volume_quota == null ? '' : quotaInviterTmp.volume_quota
                        };
                        setQuotaFromInviter(quotaInviterTmp);
                    }
                    // inviter also has no quota... admin is the person we would inherit from -> need to get inviter name from else where
                    else {
                        setQuotas({ parallel: 0, volume: 0, disk: 0 });
                        // TODO this can't be displayed, how should this be handled?
                        setQuotaFromInviter({ parallel: 'Infinity', volume: 'Infinity', disk: 'Infinity' });
                        fetchInviterName();
                    }
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

    useEffect(() => {
        if (inheritQuotas) {
            setQuotas(quotaFromInviter);
        } else {
            setQuotas({
                parallel: 0,
                disk: 0,
                volume: 0
            });
        }
    }, [inheritQuotas, quotaFromInviter, quotaInheritedFrom]);

    const handleUserUpdateQuotaSubmission = async () => {
        if (quotas == null) {
            return;
        }
        setIsSubmitting(true);
        const quotaUpdateParams = {};
        let needUpdate = true;
        const quotasToDelete = [];

        if (quotas.parallel != null && inheritQuotas !== true) {
            quotaUpdateParams["parallel_quota"] = quotas.parallel;
        } else {
            quotasToDelete.push("parallel_quota");
        }
        if (quotas.volume != null && inheritQuotas !== true) {
            quotaUpdateParams["volume_quota"] = quotas.volume;
        } else {
            quotasToDelete.push("volume_quota");
        }
        if (quotas.disk != null && inheritQuotas !== true) {
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
                            <div className="form-check mt-3 mb-3">
                                <input type="checkbox" className="form-check-input" checked={inheritQuotas} onChange={e => setInheritQuotas(e.target.checked)}
                                    id="inheritQuotas" />
                                <label className="form-check-label" htmlFor="inheritQuotas">Inherit quotas from inviter?</label>
                            </div>
                            <fieldset disabled={isSubmitting || inheritQuotas}>
                                <UserQuotaSelector
                                    quotas={quotas}
                                    quotaData={quotaData}
                                    userToEdit={userToEdit}
                                    setQuotas={setQuotas} />
                            </fieldset>
                            {inheritQuotas === true && <>Inherited from: <UserLink user={quotaInheritedFrom} /></>}
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
