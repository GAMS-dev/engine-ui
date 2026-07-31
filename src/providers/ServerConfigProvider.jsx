import { useState, useLayoutEffect, useContext } from 'react';
import axios from 'axios';
import { getResponseError } from '../util/util';
import { getEngineUrl } from '../util/runtimeConfig';
import ServerConfigContext from '../contexts/ServerConfigContext';
import AlertContext from '../contexts/AlertContext';

const SERVER_NAME = getEngineUrl();

const ServerConfigProvider = ({ children }) => {
  const [serverConfig, setServerConfig] = useState({});
  const [updateConfigState, setUpdateConfigState] = useState(0);
  const [, setAlertMsg] = useContext(AlertContext);
  const updateServerState = async (newConfig) => {
    if (!newConfig) {
      return;
    }
    const patchConfigForm = new FormData();
    const newConfigEntries = Object.entries(newConfig);
    if (newConfigEntries.length < 1) {
      return;
    }
    for (const [key, value] of newConfigEntries) {
      patchConfigForm.append(key, value);
    }
    await axios.patch(`${SERVER_NAME}/configuration`, patchConfigForm);
    setServerConfig((currentConfig) => {
      const updatedConfig = { ...currentConfig };
      for (const [key, value] of newConfigEntries) {
        updatedConfig[key] = value;
      }
      return updatedConfig;
    });
  };
  const serverConfigState = [
    serverConfig,
    updateServerState,
    setUpdateConfigState,
  ];
  useLayoutEffect(() => {
    const fetchConfig = async () => {
      try {
        setServerConfig((await axios.get(`${SERVER_NAME}/configuration`)).data);
      } catch (err) {
        setAlertMsg(
          `Problems fetching configuration. Error message: ${getResponseError(
            err,
          )}`,
        );
      }
    };
    fetchConfig();
  }, [setAlertMsg, updateConfigState]);
  return (
    <ServerConfigContext.Provider value={serverConfigState}>
      {children}
    </ServerConfigContext.Provider>
  );
};
export default ServerConfigProvider;
