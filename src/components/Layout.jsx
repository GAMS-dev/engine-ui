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
import UserChangeNameForm from "./UserChangeNameForm";
import Job from "./Job";
import Models from "./Models";
import NamespaceQuotaUpdateForm from "./NamespaceQuotaUpdateForm";
import Users from "./Users";
import { AlertContext, Alert } from "./Alert";

import { Routes, Route } from "react-router-dom";
import Cleanup from "./Cleanup";
import LicenseUpdateForm from "./LicenseUpdateForm";
import Usage from "./Usage";
import { getResponseError } from "./util";
import Instances from "./Instances";
import InstanceSubmissionForm from "./InstanceSubmissionForm";
import Webhooks from "./Webhooks";
import { ServerInfoContext } from "../ServerInfoContext";
import UserInstanceUpdateForm from "./UserInstanceUpdateForm";
import UserPermissionUpdateForm from "./UserPermissionUpdateForm";
import UserQuotaUpdateForm from "./UserQuotaUpdateForm";
import GroupMembers from "./GroupMembers";
import WebhookSubmissionForm from "./WebhookSubmissionForm";
import PreferencesForm from "./PreferencesForm";
import AdministrationForm from "./AdministrationForm";
import UserUpdateIdentityProviderForm from "./UserUpdateIdentityProviderForm";

const Layout = () => {
  const [{ server, roles }] = useContext(AuthContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const alertHook = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState(null);
  const [webhookAccess, setWebhookAccess] = useState("DISABLED");

  useEffect(() => {
    axios.get(`${server}/configuration`).then(res => {
      setWebhookAccess(res.data.webhook_access);
    }).catch(err => {
      console.log(getResponseError(err));
    });
    if (roles.includes("admin")) {
      axios
        .get(
          `${server}/licenses/engine`,
        )
        .then(res => {
          let expirationDate = res.data.expiration_date;
          if (expirationDate == null && res.data.license != null) {
            expirationDate = 'perpetual';
          }
          setLicenseExpiration(expirationDate);
        })
        .catch(err => {
          console.error(getResponseError(err));
        });
    }
  }, [server, roles])

  return (
    <React.Fragment>
      <AlertContext.Provider value={alertHook}>
        <Header
          isAdmin={roles.includes("admin")}
          licenseExpiration={licenseExpiration} />
        <div className="container-fluid scroll-content">
          <div className="row flex-nowrap">
            <div className="sidebar-container">
              <Sidebar
                inKubernetes={serverInfo.in_kubernetes === true}
                webhooksVisible={webhookAccess === "ENABLED" ||
                  (roles && roles.includes("admin"))} />
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
                {(roles && roles.includes('admin')) &&
                  <Route exact path="/quotas/:namespace" element={<NamespaceQuotaUpdateForm />} />
                }
                <Route path="/users" element={<Users setLicenseExpiration={setLicenseExpiration} />} />
                {(roles && roles.findIndex(role => ["admin", "inviter"].includes(role)) !== -1) &&
                  <Route path="/users/:username/permissions" element={<UserPermissionUpdateForm />} />
                }
                {(roles && roles.findIndex(role => ["admin", "inviter"].includes(role)) !== -1) &&
                  <Route path="/users/:username/quotas" element={<UserQuotaUpdateForm />} />
                }
                {(roles && roles.findIndex(role => ["admin", "inviter"].includes(role)) !== -1) &&
                  <Route path="/users/:user/identity-provider" element={<UserUpdateIdentityProviderForm />} />
                }
                {(roles && roles.findIndex(role => ["admin", "inviter"].includes(role)) !== -1 && serverInfo.in_kubernetes === true) &&
                  <Route path="/users/:userToEdit/instances" element={<UserInstanceUpdateForm />} />
                }
                <Route path="/users/:user/change-pass" element={<UserChangePassForm />} />
                <Route path="/users/:user/change-username" element={<UserChangeNameForm />} />
                {(roles && roles.includes('admin')) &&
                  <Route path="/users/:username/licenses" element={<LicenseUpdateForm />} />
                }
                <Route path="/users/:username/usage" element={<Usage />} />
                <Route path="/cleanup" element={<Cleanup />} />
                {(roles && roles.includes('admin') && serverInfo.in_kubernetes === true) &&
                  <Route path="/instances" element={<Instances />} />
                }
                {(roles && roles.includes('admin') && serverInfo.in_kubernetes === true) &&
                  <Route path="/instances/update">
                    <Route path=":label" element={<InstanceSubmissionForm />} />
                    <Route path="" element={<InstanceSubmissionForm />} />
                  </Route>
                }
                {serverInfo.in_kubernetes === true &&
                  <Route path="/preferences" element={<PreferencesForm />} />
                }
                {roles && roles.includes('admin') &&
                  <Route path="/administration" element={<AdministrationForm />} />
                }
                <Route path="/webhooks" element={<Webhooks webhookAccess={webhookAccess} setWebhookAccess={setWebhookAccess} />} />
                <Route path="/webhooks/create" element={<WebhookSubmissionForm />} />
                <Route path="*" element={<Jobs key="jobs" />} />
              </Routes>
            </main >
          </div >
        </div >
      </AlertContext.Provider >
    </React.Fragment >
  );
};

export default Layout;
