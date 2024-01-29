import React, { useState, useLayoutEffect, createContext } from "react";
import axios from "axios";
import memoize from "memoize";

export const AuthContext = createContext();

export const AuthProvider = props => {
  const [login, setLogin] = useState(
    JSON.parse(localStorage.getItem("login")) || false
  );
  const loginState = [login, setLogin];

  const [interceptor, setInterceptor] = useState(false);

  const refreshToken = memoize(async () => {
    try {
      const loginData = JSON.parse(localStorage.getItem("login"));
      const { refreshTokenData } = loginData;

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshTokenData.refreshToken);
      params.append('client_id', refreshTokenData.clientId);
      const res = await axios.post(refreshTokenData.refreshTokenEndpoint, params);

      if (res.data?.access_token == null) {
        throw new Error("Invalid response when trying to refresh token")
      }

      const newLogin = login;
      newLogin.jwt = res.data.access_token;

      if (res.data.refresh_token != null) {
        newLogin.refreshTokenData.refreshToken = res.data.refresh_token;
      }

      localStorage.setItem("login", JSON.stringify(newLogin));

      setLogin(newLogin);

      return newLogin;
    } catch (error) {
      console.error(error);
      return null;
    }
  }, {
    maxAge: 20000
  });

  useLayoutEffect(() => {
    localStorage.setItem("login", JSON.stringify(login));
    if (!login && interceptor) {
      axios.interceptors.request.eject(interceptor[0]);
      axios.interceptors.response.eject(interceptor[1]);
      setInterceptor(false);
    }
    if (login && !interceptor) {
      setInterceptor([
        axios.interceptors.request.use(
          config => {
            if (config.url.startsWith(login.server)) {
              config.headers.Authorization = "Bearer " + login.jwt;
            }
            return config;
          },
          function (error) {
            return Promise.reject(error);
          }
        ),
        axios.interceptors.response.use(
          response => response,
          async function (error) {
            let _error = error;
            if (!axios.isCancel(error) &&
              (login.server.startsWith('/') || error.request.responseURL.startsWith(login.server)) &&
              error?.response?.status === 401
            ) {
              const config = error.config;
              if (login.refreshTokenData != null && !config?.sent) {
                config.sent = true;
                const result = await refreshToken();
                if (result != null) {
                  config.headers = {
                    ...config.headers,
                    Authorization: `Bearer ${result.accessToken}`,
                  };
                  return axios(config);
                }
              }
              setLogin(false);
            }
            return Promise.reject(_error);
          }
        )
      ]);
    }
  }, [login, interceptor, refreshToken]);

  return (
    <AuthContext.Provider value={loginState}>
      {props.children}
    </AuthContext.Provider>
  );
};
