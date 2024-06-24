import React, { createContext, useContext, useLayoutEffect, useState } from "react";
import { AuthContext } from "../AuthContext";

export const availableTablePageLengths = [{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "50", label: "50" }, { value: "100", label: "100" }]

export const UserSettingsContext = createContext()

export const UserSettingsProvider = (props) => {
    const [{ username }] = useContext(AuthContext);

    const userSettingsLS = JSON.parse(localStorage.getItem('userSettings'))?.[username]

    const [userSettings, setUserSettings] = useState(userSettingsLS ? userSettingsLS : { quotaUnit: "mults", tablePageLength: "10" })

    const userSettingsState = [userSettings, setUserSettings]

    useLayoutEffect(() => {
        const userSettingsToStore = JSON.parse(localStorage.getItem('userSettings')) ?? {}
        userSettingsToStore[username] = userSettings
        localStorage.setItem('userSettings', JSON.stringify(userSettingsToStore))
    }, [userSettings, username]);

    return (
        <UserSettingsContext.Provider value={userSettingsState}>
            {props.children}
        </UserSettingsContext.Provider>
    );
};
