import React from 'react';
import { UserSettingsContext } from '../../components/UserSettingsContext';
import { AuthContext } from '../../AuthContext';
import { MemoryRouter } from 'react-router-dom';
import { ServerInfoContext } from "../../ServerInfoContext";
import { ServerConfigContext } from "../../ServerConfigContext";

export const AllProvidersWrapperDefault = ({ children, options = {} }) => {
    const quotaUnit = options.quotaUnit || 'mults';
    const tablePageLength = options.tablePageLength || 10;
    const updateUserSettings = options.updateUserSettings || (() => { });
    const username = options.username || 'admin';
    const roles = options.roles || ['admin'];
    const server = options.server || 'testserver';
    const serverConfig = options.serverConfig || {};
    const setServerConfig = options.setServerConfig || (() => { });
    const in_kubernetes = options.serverInfo || true;
    const setServerInfo = options.setServerInfo || (() => { });

    return (
        <MemoryRouter>
            <ServerConfigContext.Provider value={[serverConfig, setServerConfig]}>
                <ServerInfoContext.Provider value={[in_kubernetes, setServerInfo]}>
                    <UserSettingsContext.Provider value={[{ quotaUnit, tablePageLength }, updateUserSettings]}>
                        <AuthContext.Provider value={[{ username, roles, server }]}>
                            {children}
                        </AuthContext.Provider>
                    </UserSettingsContext.Provider>
                </ServerInfoContext.Provider>
            </ServerConfigContext.Provider>
        </MemoryRouter>
    );
};
