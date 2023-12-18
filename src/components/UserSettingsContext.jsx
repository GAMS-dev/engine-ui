import React, { createContext, useContext, useEffect, useState } from "react";


export const UserSettingsContext = createContext()

export const UserSettingsProvider = (props) => {
    const userSettingsLS = JSON.parse(localStorage.getItem('userSettings'))

    const userSettingsState = useState(userSettingsLS ? userSettingsLS : { mulitplierUnit: "mults", tablePageLength: "10" })
return (
    <UserSettingsContext.Provider value={userSettingsState}>
      {props.children}
    </UserSettingsContext.Provider>
  );
};