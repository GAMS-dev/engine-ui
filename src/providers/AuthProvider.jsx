import { useState, useLayoutEffect, useMemo } from 'react';
import axios from 'axios';
import memoize from 'memoize';
import AuthContext from '../contexts/AuthContext';

// Compares by resolved origin (not a raw string prefix) so a lookalike host
// like `https://<server>.attacker.tld` can't be mistaken for `server` and
// have the bearer token attached/treated as a same-server response.
const isSameServerUrl = (url, server) => {
  if (!url || !server) {
    return false;
  }
  const requestUrl = new URL(url, window.location.origin);
  const serverUrl = new URL(server, window.location.origin);
  if (requestUrl.origin !== serverUrl.origin) {
    return false;
  }
  const serverPath = serverUrl.pathname.endsWith('/')
    ? serverUrl.pathname
    : `${serverUrl.pathname}/`;
  return (
    requestUrl.pathname === serverUrl.pathname ||
    requestUrl.pathname.startsWith(serverPath)
  );
};

const AuthProvider = (props) => {
  const [login, setLogin] = useState(
    JSON.parse(localStorage.getItem('login')) || false,
  );
  const loginState = [login, setLogin];

  const [interceptor, setInterceptor] = useState(false);

  // Memoized on `login` (not recreated every render) so its internal cache
  // actually dedupes concurrent refresh calls, and so it doesn't force the
  // interceptor-registration effect below to re-run on every render.
  const refreshToken = useMemo(
    () =>
      memoize(
        async () => {
          try {
            const loginData = JSON.parse(localStorage.getItem('login'));
            const { refreshTokenData } = loginData;

            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refreshTokenData.refreshToken);
            params.append('client_id', refreshTokenData.clientId);
            const res = await axios.post(
              refreshTokenData.refreshTokenEndpoint,
              params,
            );

            if (res.data?.access_token == null) {
              throw new Error('Invalid response when trying to refresh token');
            }

            const newLogin = { ...login };
            newLogin.jwt = res.data.access_token;

            if (res.data.refresh_token != null) {
              newLogin.refreshTokenData.refreshToken = res.data.refresh_token;
            }

            localStorage.setItem('login', JSON.stringify(newLogin));

            setLogin(newLogin);

            return newLogin;
          } catch (error) {
            console.error(error);
            return null;
          }
        },
        {
          maxAge: 20000,
        },
      ),
    [login, setLogin],
  );

  useLayoutEffect(() => {
    localStorage.setItem('login', JSON.stringify(login));
    if (!login && interceptor) {
      axios.interceptors.request.eject(interceptor[0]);
      axios.interceptors.response.eject(interceptor[1]);
      setInterceptor(false);
    }
    if (login && !interceptor) {
      setInterceptor([
        axios.interceptors.request.use(
          (config) => {
            if (isSameServerUrl(config.url, login.server)) {
              config.headers.Authorization = 'Bearer ' + login.jwt;
            }
            return config;
          },
          function (error) {
            return Promise.reject(error);
          },
        ),
        axios.interceptors.response.use(
          (response) => response,
          async function (error) {
            let _error = error;
            if (
              !axios.isCancel(error) &&
              isSameServerUrl(error.request.responseURL, login.server)
            ) {
              if (error?.response?.status === 401) {
                const config = error.config;
                if (login.refreshTokenData != null && !config?.sent) {
                  config.sent = true;
                  const result = await refreshToken();
                  if (result != null) {
                    config.headers = {
                      ...config.headers,
                      Authorization: `Bearer ${result.jwt}`,
                    };
                    return axios(config);
                  }
                }
                setLogin(false);
              } else if (
                error?.response?.status === 503 &&
                error?.response?.data?.maintenance_mode === true &&
                ['GET', 'HEAD'].includes(error.config.method.toUpperCase())
              ) {
                setLogin(false);
              }
            }
            return Promise.reject(_error);
          },
        ),
      ]);
    }
  }, [login, interceptor, refreshToken]);

  return (
    <AuthContext.Provider value={loginState}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
