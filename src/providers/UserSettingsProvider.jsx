import { useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import AuthContext from "../contexts/AuthContext";
import ServerInfoContext from "../contexts/ServerInfoContext";
import UserSettingsContext from "../contexts/UserSettingsContext";

const UserSettingsProvider = (props) => {
    const [{ username }] = useContext(AuthContext);
    const [serverInfo] = useContext(ServerInfoContext);

    const [persistentSettings, setPersistentSettings] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('userSettings'))?.[username];
        return {
            ...saved,
            tablePageLength: saved?.tablePageLength || "10",
            _version: saved?._version || 1
        };
    });

    const derivedSettings = useMemo(() => ({
        quotaUnit: serverInfo.is_saas ? "$" : "h",
        multiplierUnit: serverInfo.is_saas ? "¢/s" : "s/s",
        quotaConversionFactor: serverInfo.is_saas ? 100 : 3600,
    }), [serverInfo.is_saas]);

    const userSettings = useMemo(() => ({
        ...persistentSettings,
        ...derivedSettings
    }), [persistentSettings, derivedSettings]);

    const updateUserSettings = useCallback((updates) => {
        setPersistentSettings(prev => {
            const next = { ...prev, ...updates };
            const allStored = JSON.parse(localStorage.getItem('userSettings')) ?? {};
            allStored[username] = next;
            localStorage.setItem('userSettings', JSON.stringify(allStored));
            return next;
        });
    }, [username]);

    useLayoutEffect(() => {
        const saved = JSON.parse(localStorage.getItem('userSettings'))?.[username];
        if (saved) {
            setPersistentSettings(saved);
        }
    }, [username])

    const contextValue = useMemo(() => [userSettings, updateUserSettings], [userSettings, updateUserSettings]);

    return (
        <UserSettingsContext.Provider value={contextValue}>
            {props.children}
        </UserSettingsContext.Provider>
    );
};
export default UserSettingsProvider;
