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

import { Switch, Route } from "react-router-dom";
import Cleanup from "./Cleanup";
import LicenseUpdateForm from "./LicenseUpdateForm";
import Usage from "./Usage";
import { getResponseError } from "./util";
import Instances from "./Instances";
import InstanceSubmissionForm from "./InstanceSubmissionForm";
import { ServerInfoContext } from "../ServerInfoContext";
import UserInstanceUpdateForm from "./UserInstanceUpdateForm";
import UserPermissionUpdateForm from "./UserPermissionUpdateForm";
import UserQuotaUpdateForm from "./UserQuotaUpdateForm";
import GroupMembers from "./GroupMembers";

const Layout = () => {
  const [{ server, roles }] = useContext(AuthContext);
  const [serverInfo] = useContext(ServerInfoContext);
  const alertHook = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState(null);

  useEffect(() => {
    if (roles.includes("admin")) {
      axios
        .get(
          `${server}/licenses/engine`,
        )
        .then(res => {
          setLicenseExpiration(res.data.expiration_date);
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
        <div className="container-fluid">
          <div className="row flex-nowrap">
            <div className="sidebar-container">
              <Sidebar inKubernetes={serverInfo.in_kubernetes === true} />
            </div>
            <main className="col" role="main">
              <Alert />
              <Switch>
                <Route exact path="/hc">
                  <Jobs key="hc" />
                </Route>
                <Route exact path="/jobs/:token">
                  <Job />
                </Route>
                <Route exact path="/new-hc-job">
                  <JobSubmissionForm newHcJob={true} />
                </Route>
                <Route exact path="/new-job">
                  <JobSubmissionForm newHcJob={false} />
                </Route>
                <Route exact path="/new-user">
                  <UserInvitationForm />
                </Route>
                <Route exact path={["/models/:namespace/new", "/models/:namespace/:modelname"]}>
                  <ModelSubmissionForm />
                </Route>
                <Route exact path="/groups/:namespace/:label">
                  <GroupMembers />
                </Route>
                <Route exact path={["/models/:selectedNs?", "/groups/:selectedNs?"]}>
                  <Models />
                </Route>
                {(roles && roles.includes('admin') !== undefined) &&
                  <Route exact path="/quotas/:namespace">
                    <NamespaceQuotaUpdateForm />
                  </Route>
                }
                <Route exact path="/users">
                  <Users setLicenseExpiration={setLicenseExpiration} />
                </Route>
                {(roles && roles.find(role => ["admin", "inviter"].includes(role)) !== undefined) &&
                  <Route exact path="/users/:username/permissions">
                    <UserPermissionUpdateForm />
                  </Route>
                }
                {(roles && roles.find(role => ["admin", "inviter"].includes(role)) !== undefined) &&
                  <Route exact path="/users/:username/quotas">
                    <UserQuotaUpdateForm />
                  </Route>
                }
                {(roles && roles.find(role => role === "admin") !== undefined && serverInfo.in_kubernetes === true) &&
                  <Route exact path="/users/:userToEdit/instances">
                    <UserInstanceUpdateForm />
                  </Route>
                }
                <Route exact path="/users/:user/change-pass">
                  <UserChangePassForm />
                </Route>
                <Route exact path="/users/:user/change-username">
                  <UserChangeNameForm />
                </Route>
                {(roles && roles.includes('admin') !== undefined) &&
                  <Route exact path="/users/:username/licenses">
                    <LicenseUpdateForm />
                  </Route>
                }
                <Route exact path="/users/:username/usage">
                  <Usage />
                </Route>
                {(roles && roles.find(role => role === "admin") !== undefined) &&
                  <Route exact path="/cleanup">
                    <Cleanup />
                  </Route>
                }
                {(roles && roles.find(role => role === "admin") !== undefined && serverInfo.in_kubernetes === true) &&
                  <Route exact path="/instances">
                    <Instances />
                  </Route>
                }
                {(roles && roles.find(role => role === "admin") !== undefined && serverInfo.in_kubernetes === true) &&
                  <Route exact path="/instances/update/:label?">
                    <InstanceSubmissionForm />
                  </Route>
                }
                <Route>
                  <Jobs key="jobs" />
                </Route>
              </Switch>
            </main>
          </div>
        </div>
      </AlertContext.Provider>
    </React.Fragment>
  );
};

export default Layout;
