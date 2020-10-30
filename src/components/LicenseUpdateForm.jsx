import React, { useState, useContext, useEffect } from "react";
import { Redirect, useParams } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import { AlertContext } from "./Alert";
import axios from "axios";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const LicenseUpdateForm = () => {
    const [{ jwt, server, roles }] = useContext(AuthContext);
    const [, setAlertMsg] = useContext(AlertContext);
    const { username } = useParams();

    const [licenseErrorMsg, setlicenseErrorMsg] = useState("");
    const [license, setLicense] = useState("");
    const [licenseAction, setLicenseAction] = useState("update");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [userEdited, setUserEdited] = useState(false);

    const useDeleteLicenseAction = e => {
        setLicenseAction("delete");
    };

    const updateLicense = e => {
        setLicense(e.target.value);
    }

    useEffect(() => {
        axios.get(`${server}/licenses/`, {
            params: { username: username }
        })
            .then(res => {
                if (res.data[0].inherited_from === res.data[0].user) {
                    setLicense(res.data[0].license);
                } else {
                    setlicenseErrorMsg(`User inherits the license from ${res.data[0].inherited_from}`);
                }
            })
            .catch(err => {
                if (err.response.status === 404) {
                    setlicenseErrorMsg('User does not have and does not inherit any license');
                }
                else {
                    setlicenseErrorMsg(`Problems while while retrieving user license. Error message: ${err.message}.`);
                }
            });
    }, [server, jwt, username]);

    const handleUserUpdateLicense = async () => {
        setIsSubmitting(true);
        const licenseUpdateForm = new FormData();
        licenseUpdateForm.append("username", username);

        if (licenseAction === "update") {
            const licenseModified = license.trim();
            if (licenseModified === "") {
                setlicenseErrorMsg("Cannot submit empty license");
                setIsSubmitting(false);
                return;
            }
            licenseUpdateForm.append("license", btoa(licenseModified));
            try {
                const res = await axios.put(`${server}/licenses/`, licenseUpdateForm);
                if (res.status !== 200) {
                    setlicenseErrorMsg("An unexpected error occurred while updating user license. Please try again later.");
                    setIsSubmitting(false);
                    return;
                }
                setLicense(licenseModified);
            }
            catch (e) {
                setlicenseErrorMsg(`An error occurred while updating user license. Error message: ${e.message}.`);
                setIsSubmitting(false);
                return;
            }
            setAlertMsg("success:User license successfully updated!");
        } else {
            setLicenseAction("update");
            try {
                const res = await axios.delete(`${server}/licenses/`, { data: licenseUpdateForm });
                if (res.status !== 200) {
                    setlicenseErrorMsg("An unexpected error occurred while deleting user license. Please try again later.");
                    setIsSubmitting(false);
                    return;
                }
            }
            catch (e) {
                if (e.response.status === 404) {
                    setlicenseErrorMsg("User does not have a license");
                    setIsSubmitting(false);
                    return;
                } else {
                    setlicenseErrorMsg(`An error occurred while deleting user license. Error message: ${e.message}.`);
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
            {!roles.includes('admin') && <Redirect to="/users" />}
            <div>
                <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 className="h2">Update license of user: {username}</h1>
                </div>
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
                            GAMS license for the user
                </label>
                        <textarea id="licenseBox" rows="6" cols="50" className="form-control" value={license} onChange={updateLicense} >

                        </textarea>
                    </fieldset>
                    <div className="mt-3">
                        <SubmitButton isSubmitting={isSubmitting}>
                            Update license
                    </SubmitButton>
                        {license &&
                            <button type="submit" className={`btn btn-lg btn-danger btn-block`}
                                disabled={isSubmitting} onClick={useDeleteLicenseAction}>
                                {isSubmitting ? <ClipLoader size={20} /> : 'Delete license'}
                            </button>}
                    </div>
                    {userEdited && <Redirect to="/users" />}
                </form>
            </div>
        </>
    );
}

export default LicenseUpdateForm;
