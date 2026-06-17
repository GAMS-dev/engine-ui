import { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';

export const UserLink = ({ user, hideMeBadge, children }) => {
  const [{ roles, username }] = useContext(AuthContext);

  return user?.deleted === true ? (
    <>
      <span className="text-muted fst-italic">{user.old_username}</span>
      <sup>
        <span className="badge rounded-pill bg-light text-dark border ms-1">
          Deleted
        </span>
      </sup>
    </>
  ) : username === user.username || roles?.length > 0 ? (
    <>
      <Link className="table-link" to={`/users/${user.username}`}>
        {' '}
        {user.username}
        {children}
      </Link>
      {user.username === username && hideMeBadge !== true ? (
        <sup>
          <span className="badge rounded-pill bg-primary ms-1">me</span>
        </sup>
      ) : (
        <></>
      )}
    </>
  ) : (
    <>{user.username}</>
  );
};

export default UserLink;
