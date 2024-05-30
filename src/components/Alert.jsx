import React, { createContext, useContext, useEffect, useState } from "react";

export const AlertContext = createContext(["", () => { }]);

export const Alert = () => {
  const [alertMsg, setAlertMsg] = useContext(AlertContext);

  const [alertType, setAlertType] = useState("danger");

  useEffect(() => {
    if (alertMsg !== "") {
      if (typeof alertMsg === "string" && alertMsg.startsWith('success:')) {
        setAlertType("success");
        return;
      } else {
        setAlertType("danger");
      }
      const alertTimer = setTimeout(() => {
        setAlertMsg("");
      }, 4000);
      return () => clearTimeout(alertTimer);
    }
  }, [alertMsg, setAlertMsg, setAlertType]);

  return (
    <div className={`alert alert-${alertType} alert-absolute alert-dismissible`} role="alert" style={{ display: alertMsg === "" && "none" }}>
      <button type="button" className="btn-close" aria-label="Close" data-bs-dismiss="alert" onClick={() => setAlertMsg("")}>
      </button>
      <strong>{typeof alertMsg === 'string' && alertMsg.startsWith('success:') ? alertMsg.substring(8) : alertMsg}</strong>
    </div>
  );
};
