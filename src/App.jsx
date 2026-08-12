import React, { useContext } from 'react';
import LoginForm from './components/LoginForm';
import LogOut from './components/LogOut';

import Layout from './components/Layout';
import AuthContext from './contexts/AuthContext';
import { MantineProvider, createTheme } from '@mantine/core';
import ServerInfoProvider from './providers/ServerInfoProvider';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { getBaseUrl } from './util/runtimeConfig';

// Keeps Mantine components (e.g. the auth token DateTimePicker) visually in
// line with the orange/rounded Bootstrap theme instead of Mantine's default blue.
const mantineTheme = createTheme({
  primaryColor: 'brand',
  primaryShade: 5,
  colors: {
    brand: [
      '#fef6ec',
      '#fdebd3',
      '#fad7a8',
      '#f8bf72',
      '#f5a942',
      '#f39619',
      '#da820b',
      '#b86e0a',
      '#965a08',
      '#6f4206',
    ],
  },
  defaultRadius: 'sm',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

const App = () => {
  const [login] = useContext(AuthContext);

  return (
    <React.Fragment>
      <Router basename={getBaseUrl()}>
        <ServerInfoProvider>
          <MantineProvider theme={mantineTheme} defaultColorScheme="auto">
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route
                path="/register"
                element={<LoginForm showRegistrationForm="true" />}
              />
              <Route path="/logout" element={<LogOut />} />
              <Route
                path="*"
                element={
                  login &&
                  window.location.search.includes('state=') === false ? (
                    <Layout />
                  ) : (
                    <Navigate replace to={`/login${window.location.search}`} />
                  )
                }
              />
            </Routes>
          </MantineProvider>
        </ServerInfoProvider>
      </Router>
    </React.Fragment>
  );
};

export default App;
