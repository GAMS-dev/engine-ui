import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { AuthContext } from "../AuthContext";

import Jobs from "./Jobs";
import JobSubmissionForm from "./JobSubmissionForm";
import ModelSubmissionForm from "./ModelSubmissionForm";
import UserInvitationForm from "./UserInvitationForm";
import UserUpdateForm from "./UserUpdateForm";
import ChangePasswordModal from "./ChangePasswordModal";
import Job from "./Job";
import Models from "./Models";
import Users from "./Users";
import { AlertContext, Alert } from "./Alert";

import { Switch, Route, useHistory } from "react-router-dom";
import Cleanup from "./Cleanup";
import LicenseUpdateForm from "./LicenseUpdateForm";
import Usage from "./Usage";
import { getResponseError } from "./util";

const Layout = () => {
  const [{ server, roles }] = useContext(AuthContext);
  const alertHook = useState("");
  const [licenseExpiration, setLicenseExpiration] = useState(null);
  const history = useHistory();
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  const logOutUser = () => {
    history.push("/logout");
  }
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
          licenseExpiration={licenseExpiration}
          changePasswordHandler={() => {
            setShowChangePasswordDialog(true);
          }} />
        <div className="container-fluid">
          <div className="row flex-nowrap">
            <div className="sidebar-container">
              <Sidebar changePasswordHandler={() => {
                setShowChangePasswordDialog(true);
              }} />
            </div>
            <main className="col" role="main">
              <Alert />
              <Switch>
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
                <Route exact path="/new-model/:namespace">
                  <ModelSubmissionForm />
                </Route>
                <Route exact path="/models">
                  <Models />
                </Route>
                {(roles && roles.length > 0) &&
                  <Route exact path="/users">
                    <Users setLicenseExpiration={setLicenseExpiration} />
                  </Route>
                }
                {(roles && roles.find(role => ["admin", "inviter"].includes(role)) !== undefined) &&
                  <Route exact path="/users/:username">
                    <UserUpdateForm />
                  </Route>
                }
                {(roles && roles.includes('admin') !== undefined) &&
                  <Route exact path="/licenses/:username">
                    <LicenseUpdateForm />
                  </Route>
                }
                {(roles && roles.includes('admin') !== undefined) &&
                  <Route exact path="/usage/:username">
                    <Usage />
                  </Route>
                }
                {(roles && roles.find(role => role === "admin") !== undefined) &&
                  <Route exact path="/cleanup">
                    <Cleanup />
                  </Route>
                }
                <Route>
                  <Jobs />
                </Route>
              </Switch>
              <ChangePasswordModal
                showDialog={showChangePasswordDialog}
                setShowDialog={setShowChangePasswordDialog}
                handleSuccess={logOutUser} />
            </main>
          </div>
        </div>
      </AlertContext.Provider>
    </React.Fragment>
  );
};

export default Layout;
