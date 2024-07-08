import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";

export const UserLink = ({ user, children }) => {

    const [{ roles, username }] = useContext(AuthContext);

    return (username === user || roles?.length > 0 ?
        <Link className="table-link" to={`/users/${user}`}> {user}{children} </Link> : <>{user}</>
    );
};
