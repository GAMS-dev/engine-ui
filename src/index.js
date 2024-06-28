import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./gams_bootstrap.scss";
import { AuthProvider } from "./AuthContext";

const root = createRoot(document.getElementById("root"));

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
