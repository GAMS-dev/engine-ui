import React, { useContext } from "react";
import LoginForm from "./components/LoginForm";
import LogOut from "./components/LogOut";

import Layout from "./components/Layout";
import { AuthContext } from "./AuthContext";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";

const BASENAME = process.env.REACT_APP_BASE_NAME ? process.env.REACT_APP_BASE_NAME : "/";

const App = () => {
  const [login] = useContext(AuthContext);

  return (
    <React.Fragment>
      <Router basename={BASENAME}>
        {!login && <Redirect to="/login" />}
        <Switch>
          <Route path="/login" exact render={() => <LoginForm />} />
          <Route path="/register" exact render={() => <LoginForm register="true" />} />
          <Route path="/logout" exact render={() => <LogOut />} />
          {login && <Route path="/" render={() => <Layout />} />}
        </Switch>
      </Router>
    </React.Fragment>
  );
};

export default App;
