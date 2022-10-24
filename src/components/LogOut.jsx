import { useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const LogOut = () => {
  const [, setLogin] = useContext(AuthContext);
  useEffect(() => {
    localStorage.removeItem("login");
    setLogin(false);
  }, [setLogin])
  return <Navigate replace to="/login" />;
};

export default LogOut;
