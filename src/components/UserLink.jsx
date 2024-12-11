import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../AuthContext";

export const UserLink = ({ user, hideMeBadge, children }) => {

    const [{ roles, username }] = useContext(AuthContext);

    return (username === user || roles?.length > 0 ?
        <>
            <Link className="table-link" to={`/users/${user}`}> {user}{children}</Link>{
                (user === username && hideMeBadge !== true) ? <sup>
                    <span className="badge rounded-pill bg-primary ms-1">me</span>
                </sup> : <></>
            }
        </> : <>{user}</>
    );
};
