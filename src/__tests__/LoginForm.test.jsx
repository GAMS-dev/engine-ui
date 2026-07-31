import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import LoginForm from '../components/LoginForm';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import OAuth2Login from '../components/OAuth2Login';
import { encryptRSA } from '../util/oauth';

vi.mock('axios');

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// OAuth2Login is a self-contained sub-component with its own dedicated tests
// (see OAuth2Login.test.jsx, which actually exercises LoginForm + the real
// OAuth2Login together). Here it is replaced with a small stub that exposes
// its `setAuthToken`/`setErrorMsg` callbacks via buttons, so LoginForm's own
// handling of OAuth/OIDC/native-client tokens can be tested in isolation.
vi.mock('../components/OAuth2Login', () => ({ default: vi.fn() }));

vi.mock('../util/oauth', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, encryptRSA: vi.fn() };
});

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault options={{ login: false }}>
    {children}
  </AllProvidersWrapperDefault>
);

const INVITATION_CODE = '123456789012345678901234567890123456';

const renderLoginForm = (options = {}) =>
  render(<LoginForm />, {
    wrapper: ({ children }) => (
      <AllProvidersWrapperDefault options={{ login: false, ...options }}>
        {children}
      </AllProvidersWrapperDefault>
    ),
  });

const homeRoute = [{ path: '/', element: <p>redirected home</p> }];

let mockOAuthTokenToEmit = null;

describe('LoginForm', () => {
  let user;
  beforeEach(() => {
    user = userEvent.setup();
    mockOAuthTokenToEmit = null;
    sessionStorage.clear();

    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        replace: vi.fn(),
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    OAuth2Login.mockImplementation((props) => (
      <div data-testid="oauth2-login-mock">
        <button
          type="button"
          onClick={() => props.setAuthToken(mockOAuthTokenToEmit)}
        >
          Simulate OAuth Token
        </button>
        <button
          type="button"
          onClick={() => props.setErrorMsg('OAuth2 error: simulated')}
        >
          Simulate OAuth Error
        </button>
      </div>
    ));

    axios.get.mockImplementation((url) => {
      switch (url) {
        case '/api/auth/providers':
          return Promise.resolve({
            status: 200,
            data: [],
          });
        case '/api/auth/password-policy':
          return Promise.resolve({
            status: 200,
            data: {
              min_password_length: 20,
              must_include_uppercase: true,
              must_include_lowercase: true,
              must_include_number: true,
              must_include_special_char: true,
              not_in_popular_passwords: true,
            },
          });
        case '/api/users/invitation/123456789012345678901234567890123456':
          return Promise.resolve({
            status: 200,
            data: {
              identity_provider: 'gams_engine',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders LoginForm correctly', async () => {
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => screen.findByText(/Register/));
  });

  it('displays maintenance alert correctly', async () => {
    axios.get.mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          message: 'Under maintenance',
          maintenance_mode: true,
        },
      },
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => screen.findByText(/GAMS Engine is under maintenance./));
  });

  it('shows the correct password policy helper text', async () => {
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await user.click(screen.getByText('Register'));
    const input = screen.getByRole('textbox');
    await user.type(input, '123456789012345678901234567890123456');
    await waitFor(() => screen.findByText(/Username/));

    const inputGroup = screen
      .getByLabelText('Password')
      .closest('.input-group');
    const svgElements = inputGroup.querySelectorAll('svg');
    const infoIcon = svgElements[1];
    await user.hover(infoIcon);
    await screen.findByText(/The minimum password length is 20/);
    expect(
      screen.getByText(
        'The minimum password length is 20. Must contain at least one uppercase letter, lowercase letter, number and special character. It is checked against commonly used passwords.',
      ),
    ).toBeInTheDocument();
  });

  describe('login', () => {
    it('logs in successfully and redirects home', async () => {
      const setLogin = vi.fn();
      axios.post.mockImplementation((url) => {
        if (url === '/api/auth/login') {
          return Promise.resolve({ data: { token: 'jwt123' } });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === '/api/users/') {
          return Promise.resolve({
            data: [{ username: 'admin', roles: ['admin'] }],
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm({
        setLogin,
        initialEntries: ['/login'],
        routes: homeRoute,
      });
      await user.type(screen.getByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'secret');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await screen.findByText('redirected home');
      expect(setLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          jwt: 'jwt123',
          username: 'admin',
          roles: ['admin'],
        }),
      );
    });

    it('shows an error for invalid credentials', async () => {
      axios.post.mockRejectedValueOnce({ response: { status: 401 } });
      renderLoginForm();
      await user.type(screen.getByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: 'Login' }));
      await screen.findByText('Invalid username and/or password');
    });

    it('shows a generic error when the server cannot be reached', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network Error'));
      renderLoginForm();
      await user.type(screen.getByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'secret');
      await user.click(screen.getByRole('button', { name: 'Login' }));
      await screen.findByText(
        'Some error occurred while trying to connect to the Engine Server. Please try again later.',
      );
    });

    it('logs in through the selected LDAP provider', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_ldap',
                label: 'Company LDAP',
                is_ldap_identity_provider: true,
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      axios.post.mockResolvedValue({ data: { token: 'ldapjwt' } });

      renderLoginForm();
      await user.click(await screen.findByText('Company LDAP'));
      await user.type(screen.getByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'secret');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ldap-providers/company_ldap/login',
          expect.objectContaining({ username: 'admin', password: 'secret' }),
        ),
      );
    });

    it('toggles between login and register and clears previous errors', async () => {
      axios.post.mockRejectedValueOnce({ response: { status: 401 } });
      renderLoginForm();
      await user.type(screen.getByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: 'Login' }));
      await screen.findByText('Invalid username and/or password');

      await user.click(screen.getByRole('link', { name: 'Register' }));

      expect(
        screen.queryByText('Invalid username and/or password'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Register' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    });
  });

  describe('invitation code validation', () => {
    it('rejects a code with an invalid length without contacting the server', async () => {
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(screen.getByPlaceholderText('Invitation code'), '12345');
      await screen.findByText('Invalid invitation code.');
      expect(axios.get).not.toHaveBeenCalledWith(
        expect.stringContaining('/users/invitation/'),
      );
    });

    it('shows an error for an unknown invitation code', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.reject({ response: { status: 404 } });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await screen.findByText('Invalid invitation code.');
    });

    it('shows a generic error when the invitation code metadata cannot be retrieved', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.reject({
            response: { status: 500, data: { message: 'db is down' } },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await screen.findByText(
        'Problems retrieving invitation code metadata. Error message: db is down.',
      );
    });

    it('rejects a code whose identity provider was deleted', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: null },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await screen.findByText(
        'Invalid invitation code: Identity provider has been deleted.',
      );
      expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();
    });

    it('auto-fills a sanitized username and hides the password fields for non-native identity providers', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: {
              identity_provider: 'company_oidc',
              identity_provider_user_subject: 'abc$def123',
            },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Username')).toHaveValue('abc'),
      );
      expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
    });
  });

  describe('registration', () => {
    it('blocks submission when the passwords do not match', async () => {
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.type(screen.getByPlaceholderText('Password'), 'password1');
      await user.type(
        screen.getByPlaceholderText('Confirm Password'),
        'password2',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));
      await screen.findByText('The password does not match.');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('ignores a direct form submission when the invitation code is not yet valid', async () => {
      // The Register submit button is disabled while the invitation code
      // hasn't been validated, but the form can still receive a native
      // submit event (e.g. pressing Enter). handleRegistration must guard
      // against this and do nothing.
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      const form = document.querySelector('form.form-signin');
      fireEvent.submit(form);

      expect(axios.post).not.toHaveBeenCalled();
      expect(
        screen.getByRole('heading', { name: 'Register' }),
      ).toBeInTheDocument();
    });

    it('registers and then logs the user in', async () => {
      const setLogin = vi.fn();
      axios.post.mockImplementation((url) => {
        if (url === '/api/users/') {
          return Promise.resolve({ data: {} });
        }
        if (url === '/api/auth/login') {
          return Promise.resolve({ data: { token: 'newjwt' } });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'gams_engine' },
          });
        }
        if (url === '/api/users/') {
          return Promise.resolve({
            data: [{ username: 'newuser', roles: ['user'] }],
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm({
        setLogin,
        initialEntries: ['/login'],
        routes: homeRoute,
      });
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.type(screen.getByPlaceholderText('Password'), 'password1');
      await user.type(
        screen.getByPlaceholderText('Confirm Password'),
        'password1',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText('redirected home');
      expect(setLogin).toHaveBeenCalledWith(
        expect.objectContaining({ jwt: 'newjwt', username: 'newuser' }),
      );
    });

    it('shows field errors returned by the server', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: 'Registration failed.',
            errors: {
              username: 'Username already taken.',
              password: 'Password too weak.',
            },
          },
        },
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.type(screen.getByPlaceholderText('Password'), 'password1');
      await user.type(
        screen.getByPlaceholderText('Confirm Password'),
        'password1',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText('Registration failed.');
      expect(screen.getByText('Username already taken.')).toBeInTheDocument();
      expect(screen.getByText('Password too weak.')).toBeInTheDocument();
    });

    it('shows a generic error when registration fails unexpectedly', async () => {
      axios.post.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'boom' } },
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.type(screen.getByPlaceholderText('Password'), 'password1');
      await user.type(
        screen.getByPlaceholderText('Confirm Password'),
        'password1',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText(
        'Some error occurred while trying to connect to the Engine Server. Please try again later.',
      );
    });

    it('registers a user for an LDAP identity provider and shows the success alert', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_ldap',
                label: 'Company LDAP',
                is_ldap_identity_provider: true,
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'company_ldap' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      axios.post.mockResolvedValueOnce({ data: {} });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText('Registration successful, you can log in now!');
      expect(
        screen.getByRole('heading', { name: 'Please sign in' }),
      ).toBeInTheDocument();
    });

    it('hands off OAuth identity-provider registration to OAuth2Login', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_oauth',
                label: 'Company OAuth',
                oauth2: { web_ui_client_id: 'cid', scopes: [] },
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'company_oauth' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() =>
        expect(OAuth2Login).toHaveBeenCalledWith(
          expect.objectContaining({
            loginConfig: expect.objectContaining({ name: 'company_oauth' }),
          }),
          undefined,
        ),
      );
      expect(JSON.parse(sessionStorage.getItem('registrationData'))).toEqual({
        username: 'newuser',
        invitationCode: INVITATION_CODE,
        invitationCodeIdentityProvider: 'company_oauth',
      });
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('native client login', () => {
    it('shows an error for an invalid native client redirect URI', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search:
            '?nc_id=com.gams.miro&nc_redirect_uri=inv@lid&nc_public_key=abc123',
          replace: vi.fn(),
          origin: 'http://localhost',
        },
        writable: true,
        configurable: true,
      });
      renderLoginForm();
      await screen.findByText('Invalid native client redirect URI: inv@lid');
    });

    it('cancels the native client confirmation and navigates away', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search:
            '?nc_id=com.gams.miro&nc_redirect_uri=valid/path&nc_public_key=abc123',
          replace: vi.fn(),
          origin: 'http://localhost',
        },
        writable: true,
        configurable: true,
      });
      renderLoginForm();
      await user.click(await screen.findByText('Cancel'));
      expect(window.location.replace).toHaveBeenCalledWith('/');
    });

    it('encrypts the JWT and redirects to the native client on success', async () => {
      mockOAuthTokenToEmit = {
        jwt: 'nativejwt',
        nativeClientParams: {
          id: 'com.gams.miro',
          redirect_uri: '/auth/login',
          public_key_b64: 'pubkey',
        },
      };
      encryptRSA.mockResolvedValueOnce({
        data: 'encdata',
        aes_key: 'key123',
        aes_iv: 'iv123',
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'Authentication successful. You can now close this window.',
      );
      expect(window.location.replace).toHaveBeenCalledWith(
        'com.gams.miro:/auth/login?jwt=encdata&aes_key=key123&aes_iv=iv123',
      );
    });

    it('shows an error when encrypting the JWT fails', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockOAuthTokenToEmit = {
        jwt: 'nativejwt',
        nativeClientParams: {
          id: 'com.gams.miro',
          redirect_uri: '/auth/login',
          public_key_b64: 'pubkey',
        },
      };
      encryptRSA.mockRejectedValueOnce(new Error('encryption boom'));

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText('Failed to encrypt JWT token');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('OAuth/OIDC token handling', () => {
    it('logs in successfully once a single user is found', async () => {
      const setLogin = vi.fn();
      mockOAuthTokenToEmit = { jwt: 'oauthjwt123', isOAuthToken: true };
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === '/api/users/') {
          return Promise.resolve({
            data: [{ username: 'oauthuser', roles: ['user'] }],
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm({
        setLogin,
        initialEntries: ['/login'],
        routes: homeRoute,
      });
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText('redirected home');
      expect(setLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          jwt: 'oauthjwt123',
          username: 'oauthuser',
          isOAuthToken: true,
        }),
      );
    });

    it('shows a generic error when not exactly one one user is returned', async () => {
      mockOAuthTokenToEmit = { jwt: 'oauthjwt123', isOAuthToken: true };
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === '/api/users/') {
          return Promise.resolve({ data: [] });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'Some error occurred while trying to connect to the Engine Server. Please try again later.',
      );
    });

    it('asks the user to register when no Engine account exists for the OAuth token', async () => {
      mockOAuthTokenToEmit = { jwt: 'oauthjwt123', isOAuthToken: true };
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === '/api/users/') {
          return Promise.reject({ response: { status: 401 } });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'There does not appear to be a GAMS Engine user associated with your account. Please register first.',
      );
    });

    it('shows a generic error when retrieving user information fails', async () => {
      mockOAuthTokenToEmit = { jwt: 'oauthjwt123', isOAuthToken: true };
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === '/api/users/') {
          return Promise.reject({
            response: { status: 500, data: { message: 'server exploded' } },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'Some error occurred while trying to retrieve user information from Engine. Error message: server exploded.',
      );
    });

    it('shows an internal error when the OIDC provider does not return a token', async () => {
      mockOAuthTokenToEmit = { jwt: 'idtoken123', isIdToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/auth/oidc-providers/login') {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'Internal error while retrieving authentication token from Engine.',
      );
    });

    it('asks the user to register when the OIDC login token is rejected', async () => {
      mockOAuthTokenToEmit = { jwt: 'idtoken123', isIdToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/auth/oidc-providers/login') {
          return Promise.reject({ response: { status: 401 } });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'There does not appear to be a GAMS Engine user associated with your account. Please register first.',
      );
    });

    it('shows a generic error when the OIDC token retrieval fails unexpectedly', async () => {
      mockOAuthTokenToEmit = { jwt: 'idtoken123', isIdToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/auth/oidc-providers/login') {
          return Promise.reject({
            response: { status: 500, data: { message: 'oidc down' } },
          });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'Problems retrieving authentication token from Engine. Error message: oidc down.',
      );
    });
  });

  describe('OAuth provider selection on the login screen', () => {
    it('initiates OAuth login when a provider button is clicked', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_oauth',
                label: 'Company OAuth',
                oauth2: { web_ui_client_id: 'cid', scopes: [] },
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Company OAuth'));

      await waitFor(() =>
        expect(OAuth2Login).toHaveBeenCalledWith(
          expect.objectContaining({
            loginConfig: expect.objectContaining({ name: 'company_oauth' }),
          }),
          undefined,
        ),
      );
    });
  });

  describe('password policy helper text', () => {
    it('describes a single requirement in singular form', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: {
              min_password_length: 12,
              must_include_number: true,
            },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'gams_engine' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      const inputGroup = (await screen.findByLabelText('Password')).closest(
        '.input-group',
      );
      const infoIcon = inputGroup.querySelectorAll('svg')[1];
      await user.hover(infoIcon);
      await screen.findByText(
        'The minimum password length is 12. Must contain at least one number.',
      );
    });

    it('shows an error when the password policy cannot be retrieved', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.reject({
            response: { data: { message: 'policy unavailable' } },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      renderLoginForm();
      await screen.findByText(
        'Problems retrieving password policy. Error message: policy unavailable.',
      );
    });
  });

  describe('identity providers not yet known to the client', () => {
    it('shows an error when the invitation code refers to a deleted identity provider', async () => {
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'ghost_provider' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText(
        'Invitation code is attached to identity provider that no longer exists.',
      );
    });

    it('shows an error when the identity provider configuration cannot be retrieved', async () => {
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.reject({
            response: { data: { message: 'provider lookup failed' } },
          });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'ghost_provider' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText(
        'Problems retrieving configuration of identity provider: ghost_provider. Error message: provider lookup failed.',
      );
    });

    it('registers directly with an LDAP identity provider discovered on submit', async () => {
      // Neither the initial ldapConfig nor OAuthConfig contain this
      // provider, so getIdentityProviderInfo must fall back to fetching it
      // directly by name and recognize it as an LDAP provider.
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'discovered_ldap',
                label: 'Discovered LDAP',
                is_ldap_identity_provider: true,
              },
            ],
          });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'discovered_ldap' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      axios.post.mockResolvedValueOnce({ data: {} });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await screen.findByText('Registration successful, you can log in now!');
      expect(axios.post).toHaveBeenCalledWith(
        '/api/users/',
        expect.any(FormData),
      );
    });
  });

  describe('two-step OAuth registration', () => {
    it('completes registration immediately when the invitation subject is already known', async () => {
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_oauth',
                label: 'Company OAuth',
                oauth2: { web_ui_client_id: 'cid', scopes: [] },
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: {
              identity_provider: 'company_oauth',
              identity_provider_user_subject: 'newuser',
            },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      axios.post.mockResolvedValueOnce({ data: {} });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Username')).toHaveValue('newuser'),
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/users/',
          expect.any(FormData),
        ),
      );
      await waitFor(() =>
        expect(OAuth2Login).toHaveBeenCalledWith(
          expect.objectContaining({
            loginConfig: expect.objectContaining({ name: 'company_oauth' }),
          }),
          undefined,
        ),
      );
    });

    it('resumes registration after an OAuth error using the stored registration data', async () => {
      sessionStorage.setItem(
        'registrationData',
        JSON.stringify({
          username: 'pendinguser',
          invitationCode: INVITATION_CODE,
          invitationCodeIdentityProvider: 'company_oauth',
        }),
      );

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Error'));

      await screen.findByText('OAuth2 error: simulated');
      expect(
        screen.getByRole('heading', { name: 'Register' }),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Invitation code')).toHaveValue(
        INVITATION_CODE,
      );
      expect(sessionStorage.getItem('registrationData')).toBeNull();
    });

    it('completes the pending registration once an OAuth token is received', async () => {
      sessionStorage.setItem(
        'registrationData',
        JSON.stringify({
          username: 'pendinguser',
          invitationCode: INVITATION_CODE,
          invitationCodeIdentityProvider: 'company_oauth',
        }),
      );
      mockOAuthTokenToEmit = { jwt: 'oauthjwt', isOAuthToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/users/') {
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === '/api/users/') {
          return Promise.resolve({
            data: [{ username: 'pendinguser', roles: ['user'] }],
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/users/',
          expect.any(FormData),
        ),
      );
    });

    it('returns to the registration form when completing the pending registration fails', async () => {
      sessionStorage.setItem(
        'registrationData',
        JSON.stringify({
          username: 'pendinguser',
          invitationCode: INVITATION_CODE,
          invitationCodeIdentityProvider: 'company_oauth',
        }),
      );
      mockOAuthTokenToEmit = { jwt: 'oauthjwt', isOAuthToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/users/') {
          return Promise.reject({
            response: {
              status: 400,
              data: {
                message: 'Registration failed.',
                errors: { username: 'Username already taken.' },
              },
            },
          });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText('Registration failed.');
      expect(screen.getByText('Username already taken.')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Register' }),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Invitation code')).toHaveValue(
        INVITATION_CODE,
      );
    });

    it('shows a generic error when completing the pending registration fails unexpectedly', async () => {
      sessionStorage.setItem(
        'registrationData',
        JSON.stringify({
          username: 'pendinguser2',
          invitationCode: INVITATION_CODE,
          invitationCodeIdentityProvider: 'company_oauth',
        }),
      );
      mockOAuthTokenToEmit = { jwt: 'oauthjwt2', isOAuthToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/users/') {
          return Promise.reject({
            response: { status: 500, data: { message: 'boom' } },
          });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText(
        'Some error occurred while trying to connect to the Engine Server. Please try again later.',
      );
      expect(
        screen.getByRole('heading', { name: 'Register' }),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Invitation code')).toHaveValue(
        INVITATION_CODE,
      );
    });

    it('shows a password field error when completing the pending registration fails with a password error', async () => {
      sessionStorage.setItem(
        'registrationData',
        JSON.stringify({
          username: 'pendinguser3',
          invitationCode: INVITATION_CODE,
          invitationCodeIdentityProvider: 'gams_engine',
        }),
      );
      mockOAuthTokenToEmit = { jwt: 'oauthjwt3', isOAuthToken: true };
      axios.post.mockImplementation((url) => {
        if (url === '/api/users/') {
          return Promise.reject({
            response: {
              status: 400,
              data: {
                message: 'Registration failed.',
                errors: { password: 'Password too weak.' },
              },
            },
          });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      await user.click(await screen.findByText('Simulate OAuth Token'));

      await screen.findByText('Registration failed.');
      expect(screen.getByText('Password too weak.')).toBeInTheDocument();
    });

    it('registers directly with an already-available OAuth token and logs in afterwards', async () => {
      mockOAuthTokenToEmit = { jwt: 'existingoauthjwt', isOAuthToken: true };
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_oauth',
                label: 'Company OAuth',
                oauth2: { web_ui_client_id: 'cid', scopes: [] },
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'company_oauth' },
          });
        }
        if (url === '/api/users/') {
          return Promise.reject({ response: { status: 401 } });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      let capturedForm;
      axios.post.mockImplementation((url, body) => {
        if (url === '/api/users/') {
          capturedForm = body;
          return Promise.resolve({ data: {} });
        }
        return Promise.reject(new Error('unexpected post ' + url));
      });

      renderLoginForm();
      // Obtain an OAuth token first (e.g. from a previous, still-unregistered
      // login attempt) before starting registration.
      await user.click(await screen.findByText('Simulate OAuth Token'));
      await screen.findByText(
        'There does not appear to be a GAMS Engine user associated with your account. Please register first.',
      );

      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() => expect(capturedForm).toBeDefined());
      expect(capturedForm.get('identification_token')).toBe('existingoauthjwt');
      // Since the subject was already known to be unknown, the already
      // obtained OAuth token is used to log the user in right away.
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          '/api/users/',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer existingoauthjwt',
            }),
          }),
        ),
      );
    });

    it('redirects to a newly discovered OAuth identity provider', async () => {
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'discovered_oauth',
                oauth2: { web_ui_client_id: 'cid', scopes: [] },
              },
            ],
          });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        if (url === `/api/users/invitation/${INVITATION_CODE}`) {
          return Promise.resolve({
            status: 200,
            data: { identity_provider: 'discovered_oauth' },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await user.click(screen.getByRole('link', { name: 'Register' }));
      await user.type(
        screen.getByPlaceholderText('Invitation code'),
        INVITATION_CODE,
      );
      await user.type(
        await screen.findByPlaceholderText('Username'),
        'newuser',
      );
      await user.click(screen.getByRole('button', { name: 'Register' }));

      await waitFor(() =>
        expect(OAuth2Login).toHaveBeenCalledWith(
          expect.objectContaining({
            loginConfig: expect.objectContaining({
              name: 'discovered_oauth',
            }),
          }),
          undefined,
        ),
      );
    });
  });

  describe('provider pre-selection via the URL', () => {
    it('pre-selects an LDAP provider named in the provider query parameter', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?provider=company_ldap',
          replace: vi.fn(),
          origin: 'http://localhost',
        },
        writable: true,
        configurable: true,
      });
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/providers') {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'company_ldap',
                label: 'Company LDAP',
                is_ldap_identity_provider: true,
              },
            ],
          });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      axios.post.mockResolvedValue({ data: { token: 'ldapjwt' } });

      renderLoginForm();
      await user.type(await screen.findByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'secret');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ldap-providers/company_ldap/login',
          expect.objectContaining({ username: 'admin' }),
        ),
      );
    });

    it('shows an error when a provider named in the URL cannot be found at all', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?provider=ghost_provider',
          replace: vi.fn(),
          origin: 'http://localhost',
        },
        writable: true,
        configurable: true,
      });
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.reject({
            response: { data: { message: 'lookup failed' } },
          });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();
      await screen.findByText(
        'Problems retrieving configuration of identity provider: ghost_provider. Error message: lookup failed.',
      );
    });

    it('hands off to OAuth2Login for an OAuth provider named in the URL but not yet fetched', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?provider=discovered_oauth2',
          replace: vi.fn(),
          origin: 'http://localhost',
        },
        writable: true,
        configurable: true,
      });
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'discovered_oauth2',
                label: 'Discovered OAuth2',
                oauth2: { web_ui_client_id: 'cid', scopes: [] },
              },
            ],
          });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      renderLoginForm();

      await waitFor(() =>
        expect(OAuth2Login).toHaveBeenCalledWith(
          expect.objectContaining({
            loginConfig: expect.objectContaining({
              name: 'discovered_oauth2',
            }),
          }),
          undefined,
        ),
      );
    });

    it('pre-selects an LDAP provider named in the URL but only found on a direct lookup', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?provider=discovered_ldap2',
          replace: vi.fn(),
          origin: 'http://localhost',
        },
        writable: true,
        configurable: true,
      });
      axios.get.mockImplementation((url, config) => {
        if (url === '/api/auth/providers' && config?.params?.name != null) {
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'discovered_ldap2',
                label: 'Discovered LDAP2',
                is_ldap_identity_provider: true,
              },
            ],
          });
        }
        if (url === '/api/auth/providers') {
          return Promise.resolve({ status: 200, data: [] });
        }
        if (url === '/api/auth/password-policy') {
          return Promise.resolve({
            status: 200,
            data: { min_password_length: 8 },
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });
      axios.post.mockResolvedValue({ data: { token: 'ldap2jwt' } });

      renderLoginForm();
      await screen.findByText('Discovered LDAP2');
      await user.type(screen.getByPlaceholderText('Username'), 'admin');
      await user.type(screen.getByPlaceholderText('Password'), 'secret');
      await user.click(screen.getByRole('button', { name: 'Login' }));

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          '/api/auth/ldap-providers/discovered_ldap2/login',
          expect.objectContaining({ username: 'admin' }),
        ),
      );
    });
  });
});
