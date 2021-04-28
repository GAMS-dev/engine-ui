import React, { createContext, useState, useLayoutEffect } from "react";
import axios from "axios";
import { getResponseError } from "./components/util";

export const ServerInfoContext = createContext();

const SERVER_NAME = process.env.REACT_APP_ENGINE_URL ? process.env.REACT_APP_ENGINE_URL : "/api";

export const ServerInfoProvider = props => {
    const [serverInfo, setServerInfo] = useState(
        JSON.parse(localStorage.getItem("serverInfo")) || false
    );
    const serverInfoState = [serverInfo, setServerInfo];
    useLayoutEffect(() => {
        if (!serverInfo || (serverInfo.timestamp + 1000 * 3600 * 24 < new Date().getTime())) {
            axios
                .get(
                    `${SERVER_NAME}/version`,
                )
                .then(res => {
                    const serverInfoTmp = res.data;
                    serverInfoTmp.timestamp = new Date().getTime();
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
