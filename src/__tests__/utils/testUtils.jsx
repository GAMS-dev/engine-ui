import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UserSettingsContext from '../../contexts/UserSettingsContext';
import AuthContext from '../../contexts/AuthContext';
import ServerInfoContext from "../../contexts/ServerInfoContext";
import ServerConfigContext from "../../contexts/ServerConfigContext";

export const AllProvidersWrapperDefault = ({ children, options = {} }) => {

    const quotaUnit = options.quotaUnit ?? '$';
    const quotaConversionFactor = quotaUnit === 'h' ? 3600 : 100
    const quotaFormattingFn = quotaUnit === '$' ? (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100) :
        (val) => `${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(val / 3600)}${Number.isFinite(val) ? 'h' : ''}`
    const multiplierUnit = quotaUnit === 'h' ? 's/s' : '¢/s'
    const tablePageLength = options.tablePageLength ?? '10';
    const updateUserSettings = options.updateUserSettings ?? vi.fn();
    const login = options.login ?? true;
    const setLogin = options.setLogin ?? vi.fn();
    const username = options.username ?? 'admin';
    const roles = options.roles ?? ['admin'];
    const server = options.server ?? 'testserver';
    const baseServerConfig = options.serverConfig ?? {};
    const instance_pool_access = options.instance_pool_access ?? undefined;
    const setServerConfig = options.setServerConfig ?? vi.fn();
    const in_kubernetes = options.in_kubernetes ?? true;
    const setServerInfo = options.setServerInfo ?? vi.fn();
    const initialEntries = options.initialEntries ?? undefined;
    const routes = options.routes ?? [];

    const serverConfig = {
        ...baseServerConfig,
        ...(instance_pool_access != null && { instance_pool_access })
    };

    return (
        <MemoryRouter initialEntries={initialEntries}>
            <Routes>
                {routes.map((route, index) => (
                    <Route key={index} {...route} />
                ))}
                <Route path='*'
                    element={
                        <ServerConfigContext.Provider value={[serverConfig, setServerConfig]}>
                            <ServerInfoContext.Provider value={[{ in_kubernetes: in_kubernetes }, setServerInfo]}>
                                <UserSettingsContext.Provider value={[{ quotaUnit, quotaConversionFactor, quotaFormattingFn, multiplierUnit, tablePageLength }, updateUserSettings]}>
                                    <AuthContext.Provider value={login ? [{ username, roles, server }, setLogin] : [login, setLogin]}>
                                        {children}
                                    </AuthContext.Provider>
                                </UserSettingsContext.Provider>
                            </ServerInfoContext.Provider>
                        </ServerConfigContext.Provider>
                    } />
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
