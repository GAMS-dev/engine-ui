import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { AuthContext } from "../AuthContext";
import Jobs from "./Jobs";
import JobSubmissionForm from "./JobSubmissionForm";
import ModelSubmissionForm from "./ModelSubmissionForm";
import UserInvitationForm from "./UserInvitationForm";
import UserChangePassForm from "./UserChangePassForm";
import InstancePoolSubmissionForm from "./InstancePoolSubmissionForm";
import Job from "./Job";
import Models from "./Models";
import NamespaceQuotaUpdateForm from "./NamespaceQuotaUpdateForm";
import Users from "./Users";
import { AlertContext, Alert } from "./Alert";
import { Routes, Route } from "react-router-dom";
import Cleanup from "./Cleanup";
import { getResponseError } from "./util";
import Webhooks from "./Webhooks";
import { ServerInfoContext } from "../ServerInfoContext";
import GroupMembers from "./GroupMembers";
import WebhookSubmissionForm from "./WebhookSubmissionForm";
import AdministrationForm from "./AdministrationForm";
import CreateAuthTokenForm from "./CreateAuthTokenForm";
import InstancePools from "./InstancePools";
import UserSettingsForm from "./UserSettingsForm";
import { UserSettingsProvider } from "./UserSettingsContext";
import UserEditBundle from "./UserEditBundle";
import { ServerConfigProvider } from "../ServerConfigContext";

const Layout = () => {
  const [{ server, roles, username }] = useContext(AuthContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const alertHook = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState(null);

  useEffect(() => {
    const fetchEngineLicense = async () => {
      let elReq
      try {
        elReq = await axios.get(`${server}/licenses/engine`,)
      } catch (err) {
        console.error(getResponseError(err))
        return
      }
      let expirationDate = elReq.data.expiration_date;
      if (expirationDate == null && elReq.data.license != null) {
        expirationDate = 'perpetual';
      }
      setLicenseExpiration(expirationDate);
    }

    if (roles.includes("admin")) {
      fetchEngineLicense()
    }
  }, [serverInfo, server, roles, username])

  return (
    <React.Fragment>
      <AlertContext.Provider value={alertHook}>
        <ServerConfigProvider>
          <UserSettingsProvider>
            <Header
              isAdmin={roles.includes("admin")}
              licenseExpiration={licenseExpiration} />
            <div className="container-fluid scroll-content">
              <div className="row flex-nowrap">
                <div className="sidebar-container">
                  <Sidebar />
                </div>
                <main className="col" role="main">
                  <Alert />
                  <Routes>
                    <Route path="/hc" element={<Jobs key="hc" />} />
                    <Route path="/jobs/:token" element={<Job />} />
                    <Route path="/new-hc-job" element={<JobSubmissionForm newHcJob={true} />} />
                    <Route path="/new-job" element={<JobSubmissionForm newHcJob={false} />} />
                    <Route path="/new-user" element={<UserInvitationForm />} />
                    <Route path="/models/:namespace/new" element={<ModelSubmissionForm />} />
                    <Route path="/models/:namespace/:modelname" element={<ModelSubmissionForm />} />
                    <Route path="/groups/:namespace/:label" element={<GroupMembers />} />
                    <Route path="/models" element={<Models />} />
                    <Route path="/models/:selectedNs" element={<Models />} />
                    <Route path="/groups" element={<Models />} />
                    <Route path="/groups/:selectedNs" element={<Models />} />
                    <Route path="/selectedNs" element={<Models />} />
                    <Route path="/nsusers/:selectedNs" element={<Models />} />
                    <Route path="/settings/*" element={<UserSettingsForm />} />
                    {(roles && roles.includes('admin')) &&
                      <Route exact path="/quotas/:namespace" element={<NamespaceQuotaUpdateForm />} />
                    }
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/:userToEdit/*" element={<UserEditBundle />} />
                    <Route path="/users/:userToEdit/change-pass" element={<UserChangePassForm />} />

                    <Route path="/cleanup" element={<Cleanup />} />
                    <Route path="/auth-token" element={<CreateAuthTokenForm />} />
                    {roles && roles.includes('admin') &&
                      <Route path="/administration/*" element={<AdministrationForm setLicenseExpiration={setLicenseExpiration} />} />
                    }
                    <Route path="/webhooks" element={<Webhooks />} />
                    <Route path="/webhooks/create" element={<WebhookSubmissionForm />} />
                    {serverInfo.in_kubernetes === true &&
                      <Route path="/pools" element={<InstancePools />} />
                    }
                    {serverInfo.in_kubernetes === true &&
                      <Route path="/pools/new" element={<InstancePoolSubmissionForm />} />
                    }
                    <Route path="*" element={<Jobs key="jobs" />} />
                  </Routes>
                </main >
              </div >
            </div >
          </UserSettingsProvider>
        </ServerConfigProvider>
      </AlertContext.Provider >
    </React.Fragment >
  );
};

export default Layout;
