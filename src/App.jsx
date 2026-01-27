import React, { useContext } from "react";
import LoginForm from "./components/LoginForm";
import LogOut from "./components/LogOut";

import Layout from "./components/Layout";
import AuthContext from "./contexts/AuthContext";
import ServerInfoProvider from "./providers/ServerInfoProvider";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

const App = () => {
  const [login] = useContext(AuthContext);

  return (
    <React.Fragment>
      <Router basename={import.meta.env.BASE_URL}>
        <ServerInfoProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<LoginForm showRegistrationForm="true" />} />
            <Route path="/logout" element={<LogOut />} />
            <Route path="*" element={login && window.location.search.includes('state=') === false ? <Layout /> : <Navigate replace to={`/login${window.location.search}`} />} />
          </Routes>
        </ServerInfoProvider>
      </Router>
    </React.Fragment>
  );
};

export default App;
