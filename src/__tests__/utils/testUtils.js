import React from 'react';
import { UserSettingsContext } from '../../components/UserSettingsContext';
import { AuthContext } from '../../AuthContext';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ServerInfoContext } from "../../ServerInfoContext";
import { ServerConfigContext } from "../../ServerConfigContext";

export const AllProvidersWrapperDefault = ({ children, options = {} }) => {

    const quotaUnit = options.quotaUnit ?? '$';
    const quotaConversionFactor = quotaUnit === 'h' ? 3600 : 100
    const multiplierUnit = quotaUnit === 'h' ? 's/s' : '¢/s'
    const tablePageLength = options.tablePageLength ?? '10';
    const updateUserSettings = options.updateUserSettings ?? jest.fn();
    const login = options.login ?? true;
    const setLogin = options.setLogin ?? jest.fn();
    const username = options.username ?? 'admin';
    const roles = options.roles ?? ['admin'];
    const server = options.server ?? 'testserver';
    const serverConfig = options.serverConfig ?? {};
    const instance_pool_access = options.instance_pool_access ?? undefined;
    const setServerConfig = options.setServerConfig ?? jest.fn();
    const in_kubernetes = options.in_kubernetes ?? true;
    const setServerInfo = options.setServerInfo ?? jest.fn();
    const initialEntries = options.initialEntries ?? undefined;
    const routes = options.routes ?? [];

    instance_pool_access && (serverConfig.instance_pool_access = instance_pool_access);

    return (
        <MemoryRouter initialEntries={initialEntries}>
            <Routes>
                <Route path='*'
                    element={
                        <ServerConfigContext.Provider value={[serverConfig, setServerConfig]}>
                            <ServerInfoContext.Provider value={[{ in_kubernetes: in_kubernetes }, setServerInfo]}>
                                <UserSettingsContext.Provider value={[{ quotaUnit, quotaConversionFactor, multiplierUnit, tablePageLength }, updateUserSettings]}>
                                    <AuthContext.Provider value={login ? [{ username, roles, server }, setLogin] : [login, setLogin]}>
                                        {children}
                                    </AuthContext.Provider>
                                </UserSettingsContext.Provider>
                            </ServerInfoContext.Provider>
                        </ServerConfigContext.Provider>
                    } />
                {routes.map((route, index) => (
                    <Route key={index} {...route} />
                ))}
            </Routes>
        </MemoryRouter >
    );
};


export const suppressActWarnings = () => {
    const originalError = console.error;
    beforeAll(() => {
        console.error = (...args) => {
            if (/Warning.*not wrapped in act/.test(args[0])) {
                return;
            }
            originalError.call(console, ...args);
        };
    });

    afterAll(() => {
        console.error = originalError;
    });
};
