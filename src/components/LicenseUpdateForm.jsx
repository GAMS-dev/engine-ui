import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const LicenseUpdateForm = () => {
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { userToEdit } = useParams();

    const [isLoading, setIsLoading] = useState(true);
    const [licenseErrorMsg, setlicenseErrorMsg] = useState("");
    const [registeredLicense, setRegisteredLicense] = useState("");
    const [license, setLicense] = useState("");
    const [licenseAction, setLicenseAction] = useState("update");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [userEdited, setUserEdited] = useState(false);

    useEffect(() => {
        const fetchLicense = async () => {
            let lReq
            try {
                lReq = await axios.get(`${server}/licenses/`,
                    { params: { username: userToEdit } })
            } catch (err) {
                if (err.response.status === 404) {
                    setlicenseErrorMsg('User does not have and does not inherit any license');
                    setIsLoading(false);
                }
                else {
                    setlicenseErrorMsg(`Problems while while retrieving user license. Error message: ${getResponseError(err)}.`);
                    setIsLoading(false);
                }
                return
            }
            if (lReq.data[0].inherited_from === lReq.data[0].user) {
                setLicense(lReq.data[0].license);
                setRegisteredLicense(lReq.data[0].license);
                setIsLoading(false);
            } else {
                setlicenseErrorMsg(`User inherits the license from ${lReq.data[0].inherited_from}`);
                setIsLoading(false);
            }
        }
        fetchLicense()
    }, [server, jwt, userToEdit]);

    const handleUserUpdateLicense = async () => {
        setIsSubmitting(true);
        const licenseUpdateForm = new FormData();
        licenseUpdateForm.append("username", userToEdit);

        if (licenseAction === "update") {
            const licenseModified = license.trim();
            if (licenseModified === "") {
                setlicenseErrorMsg("Cannot submit empty license");
                setIsSubmitting(false);
                return;
            }
            licenseUpdateForm.append("license", btoa(licenseModified));
            try {
                await axios.put(`${server}/licenses/`, licenseUpdateForm);
                setLicense(licenseModified);
                setRegisteredLicense(licenseModified);
            }
            catch (err) {
                setlicenseErrorMsg(`An error occurred while updating user license. Error message: ${getResponseError(err)}.`);
                setIsSubmitting(false);
                return;
            }
            setAlertMsg("success:User license successfully updated!");
        } else {
            setLicenseAction("update");
            try {
                await axios.delete(`${server}/licenses/`, { data: licenseUpdateForm });
            }
            catch (err) {
                if (err.response.status === 404) {
                    setlicenseErrorMsg("User does not have a license");
                    setIsSubmitting(false);
                    return;
                } else {
                    setlicenseErrorMsg(`An error occurred while deleting user license. Error message: ${getResponseError(err)}.`);
                    setIsSubmitting(false);
                    return;
                }
            }
            setAlertMsg("success:User license successfully deleted!");
        }

        setUserEdited(true);
    }

    return (
        <>
            {!roles.includes('admin') && <Navigate replace to="/users" />}
            {isLoading ? <ClipLoader /> :
                <div>
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleUserUpdateLicense();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: licenseErrorMsg !== "" ? "block" : "none" }}>
                            {licenseErrorMsg}
                        </div>
                        <fieldset disabled={isSubmitting}>
                            <label htmlFor="licenseBox">
                                GAMS License for User
                            </label>
                            <textarea
                                id="licenseBox"
                                rows="6"
                                cols="50"
                                className="form-control monospace no-resize"
                                value={license}
                                onChange={e => setLicense(e.target.value)} >
                            </textarea>
                        </fieldset>
                        <div className="mt-3 d-grid gap-2">
                            <SubmitButton isSubmitting={isSubmitting}>
                                Update License
                            </SubmitButton>
                            {registeredLicense !== "" &&
                                <button type="submit" className={`btn btn-lg btn-danger`}
                                    disabled={isSubmitting} onClick={() => setLicenseAction("delete")}>
                                    {isSubmitting ? <ClipLoader size={20} /> : 'Delete license'}
                                </button>}
                        </div>
                        {userEdited && <Navigate to="/users" />}
                    </form>
                </div>}
        </>
    );
}

export default LicenseUpdateForm;
