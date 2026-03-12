import { Link } from "react-router-dom";

export const JobTokenLink = ({ name, type }) => {
    return (
        <span className="font-monospace">
            {type === "hypercube_result" ? (
                <Link to={`/jobs/hc:${name}`}>
                    {name}
                    <sup>
                        <span className="badge rounded-pill bg-primary ms-1">HC</span>
                    </sup>
                </Link>
            ) : (
                <Link to={`/jobs/${name}`}>{name}</Link>
            )}
        </span>
    );
};
