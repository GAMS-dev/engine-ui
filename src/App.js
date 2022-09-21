import React, { useContext } from "react";
import LoginForm from "./components/LoginForm";
import LogOut from "./components/LogOut";

import Layout from "./components/Layout";
import { AuthContext } from "./AuthContext";
import { ServerInfoProvider } from "./ServerInfoContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

const BASENAME = process.env.REACT_APP_BASE_NAME ? process.env.REACT_APP_BASE_NAME : "/";

const App = () => {
  const [login] = useContext(AuthContext);

  return (
    <React.Fragment>
      <Router basename={BASENAME}>
        <ServerInfoProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<LoginForm register="true" />} />
            <Route path="/logout" element={<LogOut />} />
            <Route path="*" element={login ? <Layout /> : <Navigate replace to="/login" />} />
          </Routes>
        </ServerInfoProvider>
      </Router>
    </React.Fragment>
  );
};

export default App;
