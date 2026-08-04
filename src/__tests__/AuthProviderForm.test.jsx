import {
  render,
  waitFor,
  screen,
  fireEvent,
  within,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import axios from 'axios';
import AlertContext from '../contexts/AlertContext';

import AuthProviderForm from '../components/AuthProviderForm';

vi.mock('axios');

const mainProvider = {
  name: 'gams_engine',
  label: 'Login',
  hidden: false,
  oauth2: null,
  oidc: null,
  is_main_identity_provider: true,
  is_ldap_identity_provider: false,
};

const oidcAuthProviderEntry = {
  name: 'oidc_provider',
  label: 'OIDC Login',
  hidden: false,
  oauth2: null,
  oidc: 'oidc-data',
  is_main_identity_provider: false,
  is_ldap_identity_provider: false,
};

const oauth2AuthProviderEntry = {
  name: 'oauth2_provider',
  label: 'OAuth2 Login',
  hidden: true,
  oauth2: 'oauth2-data',
  oidc: null,
  is_main_identity_provider: false,
  is_ldap_identity_provider: false,
};

const ldapAuthProviderEntry = {
  name: 'ldap_provider',
  label: 'LDAP Login',
  hidden: false,
  oauth2: null,
  oidc: null,
  is_main_identity_provider: false,
  is_ldap_identity_provider: true,
};

const unknownAuthProviderEntry = {
  name: 'unknown_provider',
  label: 'Unknown Login',
  hidden: false,
  oauth2: null,
  oidc: null,
  is_main_identity_provider: false,
  is_ldap_identity_provider: false,
};

const oidcProviderDetail = {
  name: 'oidc_provider',
  issuer: 'https://oidc.example.com',
  web_ui_client_id: 'webui-client',
  web_ui_client_secret: null,
  device_client_id: null,
  device_client_secret: null,
  override_audience: null,
  authorization_endpoint: 'https://oidc.example.com/auth',
  token_endpoint: 'https://oidc.example.com/token',
  end_session_endpoint: null,
  device_authorization_endpoint: null,
  jwks_uri: 'https://oidc.example.com/jwks',
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
  extra_client_ids: ['extra-client'],
  scopes: ['openid', 'profile'],
  uid: 'sub',
};

const oauth2ScopesList = [
  { scope: 'READONLY', request_scope: 'ro' },
  { scope: 'CONFIGURATION', request_scope: 'cfg' },
  { scope: 'NAMESPACES', request_scope: 'ns' },
  { scope: 'JOBS', request_scope: 'jb' },
  { scope: 'USERS', request_scope: 'us' },
  { scope: 'HYPERCUBE', request_scope: 'hc' },
  { scope: 'CLEANUP', request_scope: 'cl' },
  { scope: 'LICENSES', request_scope: 'lic' },
  { scope: 'USAGE', request_scope: 'usg' },
  { scope: 'AUTH', request_scope: 'auth' },
];

const oauth2ProviderDetail = {
  name: 'oauth2_provider',
  issuer: 'https://oauth2.example.com',
  web_ui_client_id: 'webui-oauth2',
  web_ui_client_secret: 'websecret', // pragma: allowlist secret
  device_client_id: 'device-client',
  device_client_secret: 'devicesecret', // pragma: allowlist secret
  override_audience: 'custom-audience',
  authorization_endpoint: 'https://oauth2.example.com/auth',
  token_endpoint: 'https://oauth2.example.com/token',
  end_session_endpoint: 'https://oauth2.example.com/logout',
  device_authorization_endpoint: 'https://oauth2.example.com/device',
  jwks_uri: 'https://oauth2.example.com/jwks',
  token_endpoint_auth_methods_supported: ['client_secret_post'],
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
  scopes: oauth2ScopesList,
};

const ldapProviderDetail = {
  name: 'ldap_provider',
  host: 'ldap.example.com',
  port: 636,
  uid: 'uid',
  bind_dn: 'cn=admin,dc=example,dc=com',
  password: 'ldappass', // pragma: allowlist secret
  encryption: 'simple_tls',
  verify_certificates: true,
  active_directory: false,
  base: 'ou=users,dc=example,dc=com',
  user_filter: '(objectClass=user)',
};

const buildAxiosGetMock =
  ({
    authProviders = [mainProvider],
    oidcProviders = [],
    oauth2Providers = [],
    ldapProviders = [],
    providersAllError,
  } = {}) =>
  (url) => {
    switch (url) {
      case 'testserver/auth/providers/all':
        if (providersAllError) {
          return Promise.reject(providersAllError);
        }
        return Promise.resolve({ status: 200, data: authProviders });
      case 'testserver/auth/ldap-providers':
        return Promise.resolve({ status: 200, data: ldapProviders });
      case 'testserver/auth/oidc-providers':
        return Promise.resolve({ status: 200, data: oidcProviders });
      case 'testserver/auth/oauth2-providers':
        return Promise.resolve({ status: 200, data: oauth2Providers });
      default:
        return Promise.reject(new Error('not found'));
    }
  };

const lastFormData = (mockFn) =>
  mockFn.mock.calls[mockFn.mock.calls.length - 1][1];

const computeExpectedHostname = () =>
  new URL('testserver', document.baseURI).href;

let alertMsgMock;
const AlertWrapper = ({ children }) => (
  <AllProvidersWrapperDefault>
    <AlertContext.Provider value={['', alertMsgMock]}>
      {children}
    </AlertContext.Provider>
  </AllProvidersWrapperDefault>
);

describe('AuthProviderForm', () => {
  beforeEach(() => {
    alertMsgMock = vi.fn();
    axios.get.mockImplementation(buildAxiosGetMock());
  });

  it('renders AuthProviderForm correctly', async () => {
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
  });

  it('shows OIDC fields by default and swaps in OAuth2 and LDAP fields when the provider type changes', async () => {
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    expect(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/The scopes to request from the OP/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Host of the LDAP server/),
    ).not.toBeInTheDocument();

    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );
    expect(
      screen.getByLabelText(/Audience of the JWT tokens/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/The scopes to request from the OP/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Host of the LDAP server/),
    ).not.toBeInTheDocument();

    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');
    expect(
      screen.getByLabelText(/Host of the LDAP server/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Audience of the JWT tokens/),
    ).not.toBeInTheDocument();
  });

  it('shows manual discovery fields for OAuth2 and hides them once a discovery mode is chosen', async () => {
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    expect(
      screen.getByLabelText(/URL of the authorization endpoint/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/List of response types/)).toBeInTheDocument();
    expect(screen.getByLabelText(/List of grant types/)).toBeInTheDocument();

    await selectEvent.select(
      screen.getByLabelText('Auto discovery endpoint'),
      'OAuth 2.0 Authorization Server Metadata',
    );

    expect(
      screen.queryByLabelText(/URL of the authorization endpoint/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/List of response types/),
    ).not.toBeInTheDocument();
  });

  it('reveals the LDAP bind password only once a bind DN is entered and hides the certificate checkbox for plain encryption', async () => {
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');

    expect(
      screen.queryByLabelText(/Password of the user who is used for binding/),
    ).not.toBeInTheDocument();

    const bindDnInput = screen.getByLabelText(/Full distinguished name/);
    fireEvent.change(bindDnInput, {
      target: { value: 'cn=admin,dc=example,dc=com' },
    });

    expect(
      await screen.findByLabelText(
        /Password of the user who is used for binding/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Verify TLS certificate signature/),
    ).toBeInTheDocument();

    await selectEvent.select(
      screen.getByLabelText('Encryption method'),
      'Plain (no encryption)',
    );

    expect(
      screen.queryByLabelText(/Verify TLS certificate signature/),
    ).not.toBeInTheDocument();
  });

  it('prefills fields when editing an existing OIDC provider', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, oidcAuthProviderEntry],
        oidcProviders: [oidcProviderDetail],
      }),
    );
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('oidc_provider'));
    await userEvent.click(screen.getByText('oidc_provider'));

    await waitFor(() =>
      expect(container.querySelector('#providerName')).toHaveValue(
        'oidc_provider',
      ),
    );
    expect(container.querySelector('#providerName')).toBeDisabled();
    expect(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
    ).toHaveValue('https://oidc.example.com');
    expect(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
    ).toHaveValue('webui-client');
    expect(
      screen.getByLabelText(/URL of the authorization endpoint/),
    ).toHaveValue('https://oidc.example.com/auth');
    expect(screen.getByLabelText(/URL of the token endpoint/)).toHaveValue(
      'https://oidc.example.com/token',
    );
    expect(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
    ).toHaveValue('https://oidc.example.com/jwks');
    expect(
      screen.getByLabelText(/The scopes to request from the OP/),
    ).toHaveValue('openid,profile');
    expect(container.querySelector('#oidcUid')).toHaveValue('sub');
    expect(container.querySelector('#extraClientIDs')).toHaveValue(
      'extra-client',
    );
  });

  it('prefills fields when editing an existing OAuth2 provider', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, oauth2AuthProviderEntry],
        oauth2Providers: [oauth2ProviderDetail],
      }),
    );
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('oauth2_provider'));
    await userEvent.click(screen.getByText('oauth2_provider'));

    await waitFor(() =>
      expect(container.querySelector('#providerName')).toHaveValue(
        'oauth2_provider',
      ),
    );
    expect(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
    ).toHaveValue('https://oauth2.example.com');
    expect(container.querySelector('#webuiClientSecret')).toHaveValue(
      'websecret',
    );
    expect(container.querySelector('#deviceClientId')).toHaveValue(
      'device-client',
    );
    expect(container.querySelector('#deviceClientSecret')).toHaveValue(
      'devicesecret',
    );
    expect(container.querySelector('#oauthAudience')).toHaveValue(
      'custom-audience',
    );
    expect(
      screen.getByLabelText(/URL of the end session endpoint/),
    ).toHaveValue('https://oauth2.example.com/logout');
    expect(
      screen.getByLabelText(/URL of the device authorization endpoint/),
    ).toHaveValue('https://oauth2.example.com/device');
    expect(screen.getByLabelText(/List of response types/)).toHaveValue('code');
    expect(screen.getByLabelText(/List of grant types/)).toHaveValue(
      'authorization_code',
    );
    expect(container.querySelector('#requestScopeREADONLY')).toHaveValue('ro');
    expect(container.querySelector('#requestScopeAUTH')).toHaveValue('auth');
  });

  it('prefills fields when editing an existing LDAP provider', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, ldapAuthProviderEntry],
        ldapProviders: [ldapProviderDetail],
      }),
    );
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('ldap_provider'));
    await userEvent.click(screen.getByText('ldap_provider'));

    await waitFor(() =>
      expect(container.querySelector('#providerName')).toHaveValue(
        'ldap_provider',
      ),
    );
    expect(screen.getByLabelText(/Host of the LDAP server/)).toHaveValue(
      'ldap.example.com',
    );
    expect(screen.getByLabelText(/Port of the LDAP server/)).toHaveValue(636);
    expect(
      screen.getByLabelText(/LDAP attribute that is used as username/),
    ).toHaveValue('uid');
    expect(screen.getByLabelText(/Full distinguished name/)).toHaveValue(
      'cn=admin,dc=example,dc=com',
    );
    expect(
      screen.getByLabelText(/Password of the user who is used for binding/),
    ).toHaveValue('ldappass');
    expect(
      screen.getByLabelText(/DN of the base where users are located/),
    ).toHaveValue('ou=users,dc=example,dc=com');
    expect(screen.getByLabelText(/User filter/)).toHaveValue(
      '(objectClass=user)',
    );
  });

  it('alerts about an unknown identity provider type', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, unknownAuthProviderEntry],
      }),
    );
    render(<AuthProviderForm />, {
      wrapper: AlertWrapper,
    });
    await waitFor(() => screen.findByText('unknown_provider'));
    await userEvent.click(screen.getByText('unknown_provider'));

    await waitFor(() =>
      expect(alertMsgMock).toHaveBeenCalledWith(
        'Unknown identity provider type',
      ),
    );
  });

  it('shows an alert when fetching identity providers fails', async () => {
    axios.get.mockImplementation(() =>
      Promise.reject(new Error('network down')),
    );
    render(<AuthProviderForm />, {
      wrapper: AlertWrapper,
    });

    await waitFor(() =>
      expect(alertMsgMock).toHaveBeenCalledWith(
        'Problems retrieving identity providers. Error message: network down.',
      ),
    );
  });

  it('opens the remove provider modal when clicking the trash icon', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, oidcAuthProviderEntry],
        oidcProviders: [oidcProviderDetail],
      }),
    );
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('oidc_provider'));

    await userEvent.click(container.querySelector('.btn-danger'));

    expect(await screen.findByText('Please Confirm')).toBeInTheDocument();
  });

  it('submits a new OIDC provider and shows a success alert', async () => {
    axios.post.mockResolvedValue({});
    const { container } = render(<AuthProviderForm />, {
      wrapper: AlertWrapper,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oidc' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OIDC' },
    });
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      {
        target: { value: 'https://issuer.example.com' },
      },
    );
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/URL of the authorization endpoint/),
      { target: { value: 'https://issuer.example.com/auth' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the token endpoint/), {
      target: { value: 'https://issuer.example.com/token' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
      { target: { value: 'https://issuer.example.com/jwks' } },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith(
      'testserver/auth/oidc-providers',
      expect.any(FormData),
    );
    const fd = lastFormData(axios.post);
    expect(fd.get('name')).toBe('new_oidc');
    expect(fd.get('label')).toBe('New OIDC');
    expect(fd.get('hidden')).toBe('false');
    expect(fd.get('web_ui_client_id')).toBe('client123');
    expect(fd.get('issuer')).toBe('https://issuer.example.com');
    expect(fd.get('use_oidc_discover')).toBe('false');
    expect(fd.get('authorization_endpoint')).toBe(
      'https://issuer.example.com/auth',
    );
    expect(fd.get('token_endpoint')).toBe('https://issuer.example.com/token');
    expect(fd.get('jwks_uri')).toBe('https://issuer.example.com/jwks');
    expect(fd.getAll('scopes')).toEqual(['openid', 'profile', 'email']);
    expect(fd.get('uid')).toBe('sub');

    await waitFor(() =>
      expect(alertMsgMock).toHaveBeenCalledWith(
        'success:Identity provider added successfully!',
      ),
    );
  });

  const fillOAuth2RequiredFields = (container) => {
    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oauth2' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OAuth2' },
    });
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://issuer.example.com' } },
    );
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/URL of the authorization endpoint/),
      { target: { value: 'https://issuer.example.com/auth' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the token endpoint/), {
      target: { value: 'https://issuer.example.com/token' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
      { target: { value: 'https://issuer.example.com/jwks' } },
    );
    fireEvent.change(screen.getByLabelText(/List of response types/), {
      target: { value: 'code' },
    });
  };

  it('submits a new OAuth2 provider without override_audience when the audience matches the hostname', async () => {
    axios.post.mockResolvedValue({});
    const expectedHostname = computeExpectedHostname();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ serverConfig: { hostname: expectedHostname } }}
      >
        <AlertContext.Provider value={['', alertMsgMock]}>
          {children}
        </AlertContext.Provider>
      </AllProvidersWrapperDefault>
    );
    const { container } = render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    fillOAuth2RequiredFields(container);

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('name')).toBe('new_oauth2');
    expect(fd.has('override_audience')).toBe(false);
    expect(fd.get('request_scope_READONLY')).toBe('READONLY');
    expect(fd.get('request_scope_AUTH')).toBe('AUTH');
  });

  it('submits a new OAuth2 provider with override_audience when the audience differs from the hostname', async () => {
    axios.post.mockResolvedValue({});
    const expectedHostname = computeExpectedHostname();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ serverConfig: { hostname: expectedHostname } }}
      >
        <AlertContext.Provider value={['', alertMsgMock]}>
          {children}
        </AlertContext.Provider>
      </AllProvidersWrapperDefault>
    );
    const { container } = render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    fillOAuth2RequiredFields(container);
    fireEvent.change(container.querySelector('#oauthAudience'), {
      target: { value: 'https://custom-audience.example.com' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('override_audience')).toBe(
      'https://custom-audience.example.com',
    );
  });

  it('submits a new LDAP provider without bind credentials', async () => {
    axios.post.mockResolvedValue({});
    const { container } = render(<AuthProviderForm />, {
      wrapper: AlertWrapper,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_ldap' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New LDAP' },
    });
    fireEvent.change(screen.getByLabelText(/Host of the LDAP server/), {
      target: { value: 'ldap.example.com' },
    });
    fireEvent.change(
      screen.getByLabelText(/LDAP attribute that is used as username/),
      { target: { value: 'uid' } },
    );
    fireEvent.change(
      screen.getByLabelText(/DN of the base where users are located/),
      { target: { value: 'ou=users,dc=example,dc=com' } },
    );
    fireEvent.change(screen.getByLabelText(/User filter/), {
      target: { value: '(objectClass=user)' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith(
      'testserver/auth/ldap-providers',
      expect.any(FormData),
    );
    const fd = lastFormData(axios.post);
    expect(fd.get('host')).toBe('ldap.example.com');
    expect(fd.get('port')).toBe('389');
    expect(fd.get('uid')).toBe('uid');
    expect(fd.has('bind_dn')).toBe(false);
    expect(fd.has('password')).toBe(false);
    expect(fd.get('base')).toBe('ou=users,dc=example,dc=com');
    expect(fd.get('user_filter')).toBe('(objectClass=user)');

    await waitFor(() =>
      expect(alertMsgMock).toHaveBeenCalledWith(
        'success:Identity provider added successfully!',
      ),
    );
  });

  it('submits a new LDAP provider with bind credentials', async () => {
    axios.post.mockResolvedValue({});
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_ldap2' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New LDAP 2' },
    });
    fireEvent.change(screen.getByLabelText(/Host of the LDAP server/), {
      target: { value: 'ldap.example.com' },
    });
    fireEvent.change(
      screen.getByLabelText(/LDAP attribute that is used as username/),
      { target: { value: 'uid' } },
    );
    fireEvent.change(screen.getByLabelText(/Full distinguished name/), {
      target: { value: 'cn=admin,dc=example,dc=com' },
    });
    fireEvent.change(
      await screen.findByLabelText(
        /Password of the user who is used for binding/,
      ),
      { target: { value: 'secretpass' } },
    );
    fireEvent.change(
      screen.getByLabelText(/DN of the base where users are located/),
      { target: { value: 'ou=users,dc=example,dc=com' } },
    );
    fireEvent.change(screen.getByLabelText(/User filter/), {
      target: { value: '(objectClass=user)' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('bind_dn')).toBe('cn=admin,dc=example,dc=com');
    expect(fd.get('password')).toBe('secretpass');
  });

  it('submits an update for an existing provider using PUT', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, oidcAuthProviderEntry],
        oidcProviders: [oidcProviderDetail],
      }),
    );
    axios.put.mockResolvedValue({});
    const { container } = render(<AuthProviderForm />, {
      wrapper: AlertWrapper,
    });
    await waitFor(() => screen.findByText('oidc_provider'));
    await userEvent.click(screen.getByText('oidc_provider'));
    await waitFor(() =>
      expect(container.querySelector('#providerName')).toHaveValue(
        'oidc_provider',
      ),
    );

    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'Updated Label' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(1));
    expect(axios.put).toHaveBeenCalledWith(
      'testserver/auth/oidc-providers',
      expect.any(FormData),
    );
    const fd = lastFormData(axios.put);
    expect(fd.get('label')).toBe('Updated Label');

    await waitFor(() =>
      expect(alertMsgMock).toHaveBeenCalledWith(
        'success:Identity provider updated successfully!',
      ),
    );
  });

  it('shows field-level validation errors returned by the server', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: {
          errors: {
            name: 'Name already taken',
          },
        },
      },
    });
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_ldap' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New LDAP' },
    });
    fireEvent.change(screen.getByLabelText(/Host of the LDAP server/), {
      target: { value: 'ldap.example.com' },
    });
    fireEvent.change(
      screen.getByLabelText(/LDAP attribute that is used as username/),
      { target: { value: 'uid' } },
    );
    fireEvent.change(
      screen.getByLabelText(/DN of the base where users are located/),
      { target: { value: 'ou=users,dc=example,dc=com' } },
    );
    fireEvent.change(screen.getByLabelText(/User filter/), {
      target: { value: '(objectClass=user)' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() =>
      screen.findByText('Problems updating identity providers.'),
    );
    expect(screen.getByText('Name already taken')).toBeInTheDocument();
    expect(container.querySelector('#providerName')).toHaveClass('is-invalid');
  });

  it('shows a generic error message when submission fails without field errors', async () => {
    axios.post.mockRejectedValue({ message: 'boom' });
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_ldap' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New LDAP' },
    });
    fireEvent.change(screen.getByLabelText(/Host of the LDAP server/), {
      target: { value: 'ldap.example.com' },
    });
    fireEvent.change(
      screen.getByLabelText(/LDAP attribute that is used as username/),
      { target: { value: 'uid' } },
    );
    fireEvent.change(
      screen.getByLabelText(/DN of the base where users are located/),
      { target: { value: 'ou=users,dc=example,dc=com' } },
    );
    fireEvent.change(screen.getByLabelText(/User filter/), {
      target: { value: '(objectClass=user)' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() =>
      screen.findByText(
        /Problems updating identity providers. Error message: boom/,
      ),
    );
  });

  it('flags non-https issuer URLs and blocks submission', async () => {
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oidc' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OIDC' },
    });
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/URL of the authorization endpoint/),
      { target: { value: 'https://issuer.example.com/auth' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the token endpoint/), {
      target: { value: 'https://issuer.example.com/token' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
      { target: { value: 'https://issuer.example.com/jwks' } },
    );
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'http://example.com' } },
    );

    await waitFor(() => screen.findByText('Only HTTPS allowed'), {
      timeout: 3000,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));
    expect(axios.post).not.toHaveBeenCalled();
  }, 10000);

  it('flags issuer URLs containing a query string', async () => {
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oidc' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OIDC' },
    });
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/URL of the authorization endpoint/),
      { target: { value: 'https://issuer.example.com/auth' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the token endpoint/), {
      target: { value: 'https://issuer.example.com/token' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
      { target: { value: 'https://issuer.example.com/jwks' } },
    );
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://example.com/issuer?x=1' } },
    );

    await waitFor(
      () =>
        screen.findByText(
          /Issuer URL must not contain query string or fragment components/,
        ),
      { timeout: 3000 },
    );
  }, 10000);

  it('auto-detects OIDC discovery metadata for a valid issuer', async () => {
    axios.get.mockImplementation((url) => {
      if (
        url.startsWith('https://good.example.com') &&
        url.endsWith('/.well-known/openid-configuration')
      ) {
        return Promise.resolve({ status: 200, data: {} });
      }
      return buildAxiosGetMock()(url);
    });
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://good.example.com' } },
    );

    await waitFor(() => screen.findByText('OpenID Connect Discovery 1.0'), {
      timeout: 3000,
    });
    expect(
      screen.queryByLabelText(/URL of the authorization endpoint/),
    ).not.toBeInTheDocument();
  }, 10000);

  it('falls back to OAuth 2.0 Authorization Server Metadata discovery when only that endpoint succeeds', async () => {
    axios.get.mockImplementation((url) => {
      if (
        url.startsWith('https://good2.example.com') &&
        url.endsWith('/.well-known/openid-configuration')
      ) {
        return Promise.reject(new Error('nope'));
      }
      if (
        url.startsWith('https://good2.example.com') &&
        url.endsWith('/.well-known/oauth-authorization-server')
      ) {
        return Promise.resolve({ status: 200, data: {} });
      }
      return buildAxiosGetMock()(url);
    });
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://good2.example.com' } },
    );

    await waitFor(
      () => screen.findByText('OAuth 2.0 Authorization Server Metadata'),
      { timeout: 3000 },
    );
  }, 10000);

  it('shows the hostname mismatch banner and updates the hostname after confirmation', async () => {
    const setServerConfigMock = vi.fn().mockResolvedValue();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{
          setServerConfig: setServerConfigMock,
          routes: [{ path: '/logout', element: <p>logged out</p> }],
        }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    const expectedHostname = computeExpectedHostname();
    expect(
      await screen.findByText(
        /does not seem to be set to the correct hostname/,
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => screen.findByText('Please Confirm'));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Update' }),
    );

    await waitFor(() =>
      expect(setServerConfigMock).toHaveBeenCalledWith({
        hostname: expectedHostname,
      }),
    );
    await waitFor(() => screen.findByText('logged out'));
  });

  it('cancels the hostname update modal without navigating', async () => {
    const setServerConfigMock = vi.fn().mockResolvedValue();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ setServerConfig: setServerConfigMock }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => screen.findByText('Please Confirm'));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
    expect(setServerConfigMock).not.toHaveBeenCalled();
  });

  it('closes the hostname update modal via the header close button without navigating', async () => {
    const setServerConfigMock = vi.fn().mockResolvedValue();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ setServerConfig: setServerConfigMock }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => screen.findByText('Please Confirm'));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
    expect(setServerConfigMock).not.toHaveBeenCalled();
  });

  it('shows an alert when updating the hostname fails', async () => {
    const setServerConfigMock = vi
      .fn()
      .mockRejectedValue(new Error('cannot update'));
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ setServerConfig: setServerConfigMock }}
      >
        <AlertContext.Provider value={['', alertMsgMock]}>
          {children}
        </AlertContext.Provider>
      </AllProvidersWrapperDefault>
    );
    render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => screen.findByText('Please Confirm'));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Update' }),
    );

    await waitFor(() =>
      expect(alertMsgMock).toHaveBeenCalledWith(
        'Problems updating hostname. Error message: cannot update.',
      ),
    );
  });

  it('keeps the issuer marked valid when the debounce timer fires without any user edits', async () => {
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    // The debounce timer's own state update needs to happen inside act().
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    expect(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
    ).not.toHaveClass('is-invalid');
  }, 10000);

  it('marks the issuer invalid and blocks submission when the issuer is not a valid URL', async () => {
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oidc' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OIDC' },
    });
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/URL of the authorization endpoint/),
      { target: { value: 'https://issuer.example.com/auth' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the token endpoint/), {
      target: { value: 'https://issuer.example.com/token' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
      { target: { value: 'https://issuer.example.com/jwks' } },
    );
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'not-a-valid-url' } },
    );

    await waitFor(
      () =>
        expect(
          screen.getByLabelText(/asserts as its Issuer Identifier/),
        ).toHaveClass('is-invalid'),
      { timeout: 3000 },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));
    expect(axios.post).not.toHaveBeenCalled();
  }, 10000);

  it('falls back to manual entry when both auto-discovery endpoints fail', async () => {
    render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    await selectEvent.select(
      screen.getByLabelText('Auto discovery endpoint'),
      'OpenID Connect Discovery 1.0',
    );
    expect(
      screen.queryByLabelText(/URL of the authorization endpoint/),
    ).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://discovery-fails.example.com' } },
    );

    await waitFor(
      () =>
        expect(
          screen.getByLabelText(/URL of the authorization endpoint/),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
  }, 10000);

  it('submits a new OIDC provider including all optional fields', async () => {
    axios.post.mockResolvedValue({});
    const { container } = render(<AuthProviderForm />, {
      wrapper: AlertWrapper,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oidc_full' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OIDC Full' },
    });
    await userEvent.click(container.querySelector('#providerHidden'));
    expect(container.querySelector('#providerHidden')).toBeChecked();

    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://issuer.example.com' } },
    );
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(container.querySelector('#webuiClientSecret'), {
      target: { value: 'webuisecret' },
    });
    fireEvent.change(container.querySelector('#deviceClientId'), {
      target: { value: 'device-client-1' },
    });
    fireEvent.change(container.querySelector('#deviceClientSecret'), {
      target: { value: 'devicesecret1' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the authorization endpoint/),
      { target: { value: 'https://issuer.example.com/auth' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the token endpoint/), {
      target: { value: 'https://issuer.example.com/token' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the JSON Web Key Set document/),
      { target: { value: 'https://issuer.example.com/jwks' } },
    );
    fireEvent.change(screen.getByLabelText(/URL of the end session endpoint/), {
      target: { value: 'https://issuer.example.com/logout' },
    });
    fireEvent.change(
      screen.getByLabelText(/URL of the device authorization endpoint/),
      { target: { value: 'https://issuer.example.com/device' } },
    );
    fireEvent.change(screen.getByLabelText(/client authentication methods/i), {
      target: { value: 'client_secret_post,client_secret_basic' },
    });
    fireEvent.change(
      screen.getByLabelText(/The scopes to request from the OP/),
      { target: { value: 'openid,email' } },
    );
    fireEvent.change(container.querySelector('#oidcUid'), {
      target: { value: 'preferred_username' },
    });
    fireEvent.change(container.querySelector('#extraClientIDs'), {
      target: { value: 'extra1,extra2' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('hidden')).toBe('true');
    expect(fd.get('web_ui_client_secret')).toBe('webuisecret');
    expect(fd.get('device_client_id')).toBe('device-client-1');
    expect(fd.get('device_client_secret')).toBe('devicesecret1');
    expect(fd.get('end_session_endpoint')).toBe(
      'https://issuer.example.com/logout',
    );
    expect(fd.get('device_authorization_endpoint')).toBe(
      'https://issuer.example.com/device',
    );
    expect(fd.getAll('token_endpoint_auth_methods_supported')).toEqual([
      'client_secret_post',
      'client_secret_basic',
    ]);
    expect(fd.getAll('scopes')).toEqual(['openid', 'email']);
    expect(fd.get('uid')).toBe('preferred_username');
    expect(fd.getAll('extra_client_ids')).toEqual(['extra1', 'extra2']);
  });

  it('marks use_oauth2_auth_server_metadata false when an OAuth2 provider auto-detects OIDC discovery', async () => {
    axios.post.mockResolvedValue({});
    axios.get.mockImplementation((url) => {
      if (
        url.startsWith('https://oauth2-oidc.example.com') &&
        url.endsWith('/.well-known/openid-configuration')
      ) {
        return Promise.resolve({ status: 200, data: {} });
      }
      return buildAxiosGetMock()(url);
    });
    const expectedHostname = computeExpectedHostname();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ serverConfig: { hostname: expectedHostname } }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    const { container } = render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oauth2_oidc' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OAuth2 OIDC' },
    });
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://oauth2-oidc.example.com' } },
    );

    await waitFor(() => screen.findByText('OpenID Connect Discovery 1.0'), {
      timeout: 3000,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('use_oidc_discover')).toBe('true');
    expect(fd.get('use_oauth2_auth_server_metadata')).toBe('false');
  }, 10000);

  it('marks use_oauth2_auth_server_metadata true when OAuth 2.0 Authorization Server Metadata discovery is selected', async () => {
    axios.post.mockResolvedValue({});
    const expectedHostname = computeExpectedHostname();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ serverConfig: { hostname: expectedHostname } }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    const { container } = render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_oauth2_meta' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New OAuth2 Meta' },
    });
    fireEvent.change(
      screen.getByLabelText(/Client ID to be used by the Engine UI/),
      { target: { value: 'client123' } },
    );
    fireEvent.change(
      screen.getByLabelText(/asserts as its Issuer Identifier/),
      { target: { value: 'https://issuer.example.com' } },
    );

    // let the automatic discovery debounce settle (it fails and reverts to
    // manual) before manually overriding the discovery mode below, so the
    // debounce doesn't clobber our manual selection afterwards. The
    // debounce's own state update needs to happen inside act().
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    await selectEvent.select(
      screen.getByLabelText('Auto discovery endpoint'),
      'OAuth 2.0 Authorization Server Metadata',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('use_oidc_discover')).toBe('false');
    expect(fd.get('use_oauth2_auth_server_metadata')).toBe('true');
  }, 10000);

  it('submits a new OAuth2 provider with custom manual discovery lists and request scopes', async () => {
    axios.post.mockResolvedValue({});
    const expectedHostname = computeExpectedHostname();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ serverConfig: { hostname: expectedHostname } }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    const { container } = render(<AuthProviderForm />, { wrapper: Wrapper });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(
      screen.getByLabelText('Provider type'),
      'OAuth 2.0',
    );

    fillOAuth2RequiredFields(container);
    fireEvent.change(screen.getByLabelText(/List of grant types/), {
      target: { value: 'authorization_code,refresh_token' },
    });

    fireEvent.change(container.querySelector('#requestScopeREADONLY'), {
      target: { value: 'scope-ro' },
    });
    fireEvent.change(container.querySelector('#requestScopeCONFIGURATION'), {
      target: { value: 'scope-cfg' },
    });
    fireEvent.change(container.querySelector('#requestScopeNAMESPACES'), {
      target: { value: 'scope-ns' },
    });
    fireEvent.change(container.querySelector('#requestScopeJOBS'), {
      target: { value: 'scope-jobs' },
    });
    fireEvent.change(container.querySelector('#requestScopeUSERS'), {
      target: { value: 'scope-users' },
    });
    fireEvent.change(container.querySelector('#requestScopeHYPERCUBE'), {
      target: { value: 'scope-hc' },
    });
    fireEvent.change(container.querySelector('#requestScopeCLEANUP'), {
      target: { value: 'scope-cleanup' },
    });
    fireEvent.change(container.querySelector('#requestScopeLICENSES'), {
      target: { value: 'scope-lic' },
    });
    fireEvent.change(container.querySelector('#requestScopeUSAGE'), {
      target: { value: 'scope-usage' },
    });
    fireEvent.change(container.querySelector('#requestScopeAUTH'), {
      target: { value: 'scope-auth' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.getAll('grant_types_supported')).toEqual([
      'authorization_code',
      'refresh_token',
    ]);
    expect(fd.get('request_scope_READONLY')).toBe('scope-ro');
    expect(fd.get('request_scope_CONFIGURATION')).toBe('scope-cfg');
    expect(fd.get('request_scope_NAMESPACES')).toBe('scope-ns');
    expect(fd.get('request_scope_JOBS')).toBe('scope-jobs');
    expect(fd.get('request_scope_USERS')).toBe('scope-users');
    expect(fd.get('request_scope_HYPERCUBE')).toBe('scope-hc');
    expect(fd.get('request_scope_CLEANUP')).toBe('scope-cleanup');
    expect(fd.get('request_scope_LICENSES')).toBe('scope-lic');
    expect(fd.get('request_scope_USAGE')).toBe('scope-usage');
    expect(fd.get('request_scope_AUTH')).toBe('scope-auth');
  });

  it('submits a new LDAP provider with a custom port, active directory enabled, and certificate verification disabled', async () => {
    axios.post.mockResolvedValue({});
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add New Identity Provider/));
    await selectEvent.select(screen.getByLabelText('Provider type'), 'LDAP');

    fireEvent.change(container.querySelector('#providerName'), {
      target: { value: 'new_ldap_ad' },
    });
    fireEvent.change(container.querySelector('#providerLabel'), {
      target: { value: 'New LDAP AD' },
    });
    fireEvent.change(screen.getByLabelText(/Host of the LDAP server/), {
      target: { value: 'ldap.example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Port of the LDAP server/), {
      target: { value: '636' },
    });
    await userEvent.click(
      screen.getByLabelText(/Is LDAP server an Active Directory/),
    );
    fireEvent.change(
      screen.getByLabelText(/LDAP attribute that is used as username/),
      { target: { value: 'sAMAccountName' } },
    );
    fireEvent.change(
      screen.getByLabelText(/DN of the base where users are located/),
      { target: { value: 'ou=users,dc=example,dc=com' } },
    );
    fireEvent.change(screen.getByLabelText(/User filter/), {
      target: { value: '(objectClass=user)' },
    });
    await userEvent.click(
      screen.getByLabelText(/Verify TLS certificate signature/),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const fd = lastFormData(axios.post);
    expect(fd.get('port')).toBe('636');
    expect(fd.get('active_directory')).toBe('true');
    expect(fd.get('verify_certificates')).toBe('false');
  });

  it('resets the form when clicking Add New Identity Provider after selecting an existing provider', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({
        authProviders: [mainProvider, oidcAuthProviderEntry],
        oidcProviders: [oidcProviderDetail],
      }),
    );
    const { container } = render(<AuthProviderForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('oidc_provider'));
    await userEvent.click(screen.getByText('oidc_provider'));
    await waitFor(() =>
      expect(container.querySelector('#providerName')).toHaveValue(
        'oidc_provider',
      ),
    );

    await userEvent.click(screen.getByText('Add New Identity Provider'));

    await waitFor(() =>
      expect(container.querySelector('#providerName')).toHaveValue(''),
    );
    expect(container.querySelector('#providerName')).not.toBeDisabled();
  });
});
