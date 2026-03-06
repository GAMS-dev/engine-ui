import { useState, useLayoutEffect } from "react";
import axios from "axios";
import { getResponseError } from "../util/util";
import ServerInfoContext from "../contexts/ServerInfoContext";

const SERVER_NAME = import.meta.env.VITE_ENGINE_URL ? import.meta.env.VITE_ENGINE_URL : "/api";

const ServerInfoProvider = props => {
    const [serverInfo, setServerInfo] = useState(
        JSON.parse(localStorage.getItem("serverInfo")) || false
    );
    const serverInfoState = [serverInfo, setServerInfo];

    useLayoutEffect(() => {
        if (serverInfo?.is_saas == null || serverInfo?.use_brokerv2 == null || (serverInfo.timestamp + 1000 * 3600 * 24 < new Date().getTime())) {

            Promise.all([
                axios.get(`${SERVER_NAME}/version`),
                axios.get(`${SERVER_NAME}/configuration`)
            ])
                .then(([versionRes, configRes]) => {
                    const serverInfoTmp = versionRes.data;
                    serverInfoTmp.timestamp = new Date().getTime();
                    serverInfoTmp.is_saas = ["engine.gams.com", "engine-eu.gams.com"].includes(window.location.hostname);
                    serverInfoTmp.use_brokerv2 = configRes.data.use_brokerv2 ?? false;
                    setServerInfo(serverInfoTmp);
                    localStorage.setItem("serverInfo", JSON.stringify(serverInfoTmp));
                })
                .catch(err => {
                    console.error(getResponseError(err));
                });
        }
    }, [serverInfo])

    return (
        <ServerInfoContext.Provider value={serverInfoState}>
            {props.children}
        </ServerInfoContext.Provider>
    );
}

export default ServerInfoProvider;
