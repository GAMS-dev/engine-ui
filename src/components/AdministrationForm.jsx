import { useContext } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Tab, Nav } from 'react-bootstrap';
import ServerInfoContext from '../contexts/ServerInfoContext.jsx';
import LicUpdateButton from './LicenseUpdateButton';
import UpdatePasswordPolicyButton from './UpdatePasswordPolicyButton';
import ToggleConfigOptionButton from './ToggleConfigOptionButton.jsx';

const AdministrationForm = ({ setLicenseExpiration }) => {
  const [serverInfo] = useContext(ServerInfoContext);
  let location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Administration</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            <LicUpdateButton
              type="engine"
              setLicenseExpiration={setLicenseExpiration}
            />
            <LicUpdateButton type="system" />
          </div>
          <div className="btn-group">
            <UpdatePasswordPolicyButton />
            {serverInfo.in_kubernetes !== true && (
              <ToggleConfigOptionButton configKey="job_priorities_access" />
            )}
          </div>
        </div>
      </div>
      {serverInfo.in_kubernetes === true ? (
        <>
          <Tab.Container
            defaultActiveKey="authproviders"
            activeKey={
              location.pathname.includes('authproviders')
                ? 'authproviders'
                : 'instances'
            }
            onSelect={(key) => navigate(key)}
          >
            <Nav className="nav-tabs">
              <Nav.Item>
                <Nav.Link eventKey="authproviders">Identity Providers</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="instances">Instances</Nav.Link>
              </Nav.Item>
            </Nav>
          </Tab.Container>
          <Tab.Content>
            <Outlet />
          </Tab.Content>
        </>
      ) : (
        <Outlet />
      )}
    </>
  );
};

export default AdministrationForm;
