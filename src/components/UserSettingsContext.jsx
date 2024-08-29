import React, { createContext, useCallback, useContext, useLayoutEffect, useState } from "react";
import { AuthContext } from "../AuthContext";

export const availableTablePageLengths = [{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }, { value: "100", label: "100" }]

export const UserSettingsContext = createContext()

const defaultSettings = { _version: 1, quotaUnit: "$", multiplierUnit: "¢/s", quotaConversionFactor: 100, tablePageLength: "10" }

export const UserSettingsProvider = (props) => {
    const [{ username }] = useContext(AuthContext);
    const [userSettings, setUserSettings] = useState(defaultSettings)


    const updateUserSettings = useCallback((newSettings) => {
        const userSettingsToStore = JSON.parse(localStorage.getItem('userSettings')) ?? {}
        if (newSettings) {
            for (const [key, value] of Object.entries(defaultSettings)) {
                if (!newSettings.hasOwnProperty(key)) {
                    newSettings[key] = value
                }
            }
        } else {
            newSettings = defaultSettings
        }
        userSettingsToStore[username] = newSettings
        localStorage.setItem('userSettings', JSON.stringify(userSettingsToStore))
        setUserSettings(newSettings)
    }, [username])

    useLayoutEffect(() => {
        let userSettingsLS = JSON.parse(localStorage.getItem('userSettings'))?.[username]
        if (userSettingsLS?._version !== defaultSettings?._version) {
            updateUserSettings()
        } else {
            updateUserSettings(userSettingsLS)
        }
    }, [username, updateUserSettings])

    const userSettingsState = [userSettings, updateUserSettings]

    return (
        <UserSettingsContext.Provider value={userSettingsState}>
            {props.children}
        </UserSettingsContext.Provider>
    );
};
