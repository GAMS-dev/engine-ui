import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { AuthContext } from "../AuthContext";
import { ServerInfoContext } from "../ServerInfoContext";

export const availableTablePageLengths = [{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }, { value: "100", label: "100" }]

export const UserSettingsContext = createContext()

export const UserSettingsProvider = (props) => {
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
