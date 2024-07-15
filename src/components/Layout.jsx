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
import { getInstanceData, getResponseError } from "./util";
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

const Layout = () => {
  const [{ server, roles, username }] = useContext(AuthContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const alertHook = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState(null);
  const [webhookAccess, setWebhookAccess] = useState("DISABLED");
  const [instancePoolAccess, setInstancePoolAccess] = useState("DISABLED");
  const [instancesVisible, setInstancesVisible] = useState(false);

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const resConfig = await axios.get(`${server}/configuration`);
        setWebhookAccess(resConfig.data.webhook_access);
        const instancePoolAccessTmp = resConfig.data.instance_pool_access;
        setInstancePoolAccess(instancePoolAccessTmp);
        if (serverInfo.in_kubernetes !== true) {
          setInstancesVisible(false);
          return;
        }
        if (roles.includes("admin")) {
          setInstancesVisible(true);
          return;
        }
        if (instancePoolAccessTmp === "ENABLED" || (roles.includes("inviter") && instancePoolAccessTmp === "INVITER_ONLY")) {
          setInstancesVisible(true);
          return;
        }
        const instanceData = await getInstanceData(server, username);
        if (instanceData.instances.find(instance => instance.is_pool === true) != null) {
          setInstancesVisible(true);
          return;
        }
        setInstancesVisible(false);
      }
      catch (err) {
        console.log(getResponseError(err));
      }
    }
    fetchConfigData();
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
  }, [serverInfo, server, roles, username])

  return (
    <React.Fragment>
      <AlertContext.Provider value={alertHook}>
        <UserSettingsProvider>
          <Header
            isAdmin={roles.includes("admin")}
            licenseExpiration={licenseExpiration} />
          <div className="container-fluid scroll-content">
            <div className="row flex-nowrap">
              <div className="sidebar-container">
                <Sidebar
                  inKubernetes={serverInfo.in_kubernetes === true}
                  instancesVisible={instancesVisible}
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
                  <Route path="/settings/*" element={<UserSettingsForm webhookAccess={webhookAccess} />} />
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
                  <Route path="/webhooks" element={<Webhooks webhookAccess={webhookAccess} setWebhookAccess={setWebhookAccess} />} />
                  <Route path="/webhooks/create" element={<WebhookSubmissionForm />} />
                  {serverInfo.in_kubernetes === true &&
                    <Route path="/pools" element={<InstancePools instancePoolAccess={instancePoolAccess} setInstancePoolAccess={setInstancePoolAccess} />} />
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
      </AlertContext.Provider >
    </React.Fragment >
  );
};

export default Layout;
