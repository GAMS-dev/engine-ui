import React, {useState, useContext} from "react";
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
import {AlertContext, Alert} from "./Alert";

import { Switch, Route, useHistory } from "react-router-dom";
import Cleanup from "./Cleanup";

const Layout = () => {
  const [{ roles }] = useContext(AuthContext);
  const alertHook = useState("");
  const history = useHistory();
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  const changePasswordHandler = () => {
    setShowChangePasswordDialog(true);
  }
  const logOutUser = () => {
    history.push("/logout");
  }

  return (
    <React.Fragment>
      <AlertContext.Provider value={alertHook}>
        <Header />
        <div className="container-fluid">
          <div className="row flex-nowrap">
            <div className="sidebar-container">
              <Sidebar changePasswordHandler={changePasswordHandler}/>
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
                <Route exact path={["/", "/jobs"]}>
                  <Jobs />
                </Route>
                {(roles && roles.length > 0) &&
                  <Route exact path="/users">
                    <Users />
                  </Route>
                }
                {(roles && roles.find(role => role === "admin") !== undefined) &&
                  <Route exact path="/users/:username">
                    <UserUpdateForm />
                  </Route>
                }
                {(roles && roles.find(role => role === "admin") !== undefined) &&
                  <Route exact path="/cleanup">
                    <Cleanup />
                  </Route>
                }
              </Switch>
              <ChangePasswordModal 
                showDialog={showChangePasswordDialog} 
                setShowDialog={setShowChangePasswordDialog}
                handleSuccess={logOutUser}/>
            </main>
          </div>
        </div>
      </AlertContext.Provider>
    </React.Fragment>
  );
};

export default Layout;
