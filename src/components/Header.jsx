import { useContext } from 'react';
import { Badge } from 'react-bootstrap';
import { Link } from 'react-router';
import logo from '../assets/images/logo.svg';
import ServerInfoContext from '../contexts/ServerInfoContext';
import UserMenu from './UserMenu';

const Header = ({ licenseExpiration, isAdmin }) => {
  const [serverInfo] = useContext(ServerInfoContext);

  const licenseValid =
    isAdmin === true &&
    (licenseExpiration === 'perpetual' || !!licenseExpiration);
  const expiresIn =
    isAdmin === true && licenseExpiration && licenseExpiration !== 'perpetual'
      ? Math.ceil(
          (Date.parse(licenseExpiration) - new Date()) / (1000 * 60 * 60 * 24),
        )
      : null;

  return (
    <>
      <header className="navbar navbar-expand-lg navbar-dark bg-secondary border-bottom border-primary fixed-top shadow d-none d-md-flex">
        {isAdmin && (
          <div
            className={`info-header ${expiresIn < 31 && !(licenseValid && expiresIn === null) ? 'text-error fw-bold' : 'text-light'}`}
          >
            {expiresIn == null
              ? licenseValid
                ? 'Perpetual license'
                : 'No license'
              : expiresIn < 0
                ? 'License expired'
                : `License expires in: ${expiresIn} days`}
          </div>
        )}
        {serverInfo && (
          <div className="info-header info-header-right text-light">
            {`${serverInfo.version} / GAMS ${serverInfo.gams_version}`}
          </div>
        )}
        <Link to="/" className="navbar-brand m-auto d-none d-md-block">
          <img src={logo} className="navbar-logo" alt="GAMS Logo" />
          {serverInfo.in_kubernetes === true && (
            <Badge id="logoPostfix" pill bg="primary">
              {serverInfo.is_saas ? 'SaaS' : 'K'}
            </Badge>
          )}
        </Link>
      </header>
      <ul className="nav flex-column nav-top d-block bg-light d-md-none">
        <UserMenu />
      </ul>
    </>
  );
};

export default Header;
