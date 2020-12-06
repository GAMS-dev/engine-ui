import React, { createContext, useContext, useEffect, useState } from "react";

export const AlertContext = createContext(["", () => { }]);

export const Alert = () => {
  const [alertMsg, setAlertMsg] = useContext(AlertContext);

  const [alertType, setAlertType] = useState("danger");

  useEffect(() => {
    if (alertMsg !== "") {
      if (alertMsg.startsWith('success:')) {
        setAlertType("success");
      } else {
        setAlertType("danger");
      }
      const alertTimer = setTimeout(() => {
        //setAlertMsg("");
      }, 4000);
      return () => clearTimeout(alertTimer);
    }
  }, [alertMsg, setAlertMsg, setAlertType]);

  return (
    <div className={`alert alert-${alertType} alert-absolute alert-dismissible`} role="alert" style={{ display: alertMsg === "" && "none" }}>
      <button type="button" className="close" aria-label="Close" onClick={() => setAlertMsg("")}>
        <span aria-hidden="true">&times;</span>
      </button>
      <strong>{alertMsg.startsWith('success:') ? alertMsg.substring(8) : alertMsg}</strong>
    </div>
  );
};