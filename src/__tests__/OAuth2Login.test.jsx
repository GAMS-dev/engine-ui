import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { TextDecoder, TextEncoder } from 'util';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import userEvent from '@testing-library/user-event';
import LoginForm from '../components/LoginForm';
import { OAuthClient } from './utils/oauth';

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault
    options={{ login: false, server: 'http://localhost' }}
  >
    {children}
  </AllProvidersWrapperDefault>
);

vi.mock('axios');

Object.defineProperty(window, 'crypto', {
  value: globalThis.crypto,
});
Object.assign(global, { TextDecoder, TextEncoder });

describe('LoginForm with OAuth2 flow', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('prints error with invalid native client id', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/password-policy')) {
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
      }
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      console.log(url);
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '?nc_id=toString',
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText('Invalid native client id: toString'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          'Please confirm that you are trying to log in with',
          { exact: false },
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('prints error with missing nc parameters', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/password-policy')) {
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
      }
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      console.log(url);
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '?nc_id=com.gams.miro',
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText('Missing native client parameters'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          'Please confirm that you are trying to log in with',
          { exact: false },
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('prints error with missing nc parameters', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/password-policy')) {
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
      }
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      console.log(url);
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '?nc_id=com.gams.miro',
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText('Missing native client parameters'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(
          'Please confirm that you are trying to log in with',
          { exact: false },
        ),
      ).not.toBeInTheDocument();
    });
  });

  it('OAuth2 redirect works with valid nc params', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/password-policy')) {
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
      }
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({
          status: 200,
          data: [
            {
              name: 'test',
              is_main_identity_provider: false,
              is_ldap_identity_provider: false,
              oidc: {
                issuer: 'https://accounts.google.com',
                authorization_endpoint:
                  'https://accounts.google.com/o/oauth2/v2/auth',
                token_endpoint: 'https://oauth2.googleapis.com/token',
                jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
                web_ui_client_id: 'testclientid',
                scopes: ['email', 'profile', 'openid'],
                has_web_ui_client_secret: true,
              },
            },
          ],
        });
      }
      console.log(url);
    });
    Object.defineProperty(window, 'location', {
      value: {
        search:
          '?provider=test&nc_id=com.gams.miro&nc_redirect_uri=/test/def&nc_public_key=mysuperpublicpublickey',
        replace: vi.fn(() => null),
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText('Please confirm that you are trying to log in with', {
          exact: false,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText('GAMS MIRO', { exact: false }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByText('Confirm'));
    await waitFor(() => {
      expect(window.location.replace).toBeCalledWith(
        expect.stringMatching(
          /https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?response_type=code&client_id=testclientid&scope=email%20profile%20openid&state=[a-zA-Z0-9_\-/]+&redirect_uri=http%3A%2F%2Flocalhost&code_challenge=[a-zA-Z0-9_\-/]+&code_challenge_method=S256/,
        ),
      );
      expect(window.sessionStorage.setItem).toBeCalledWith(
        'authParams',
        expect.stringMatching(/nativeClientParams/),
      );
    });
  });

  it('Encrypting Engine token works with valid nc params', async () => {
    const oAuthClient = await OAuthClient.build();
    const publicKey = await oAuthClient.getB64URLEncodedPublicKey();
    const tokenEndpointUrl = 'https://oauth2.googleapis.com/token';
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/password-policy')) {
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
      }
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({
          status: 200,
          data: [
            {
              name: 'test',
              is_main_identity_provider: false,
              is_ldap_identity_provider: false,
              oidc: {
                issuer: 'https://accounts.google.com',
                authorization_endpoint:
                  'https://accounts.google.com/o/oauth2/v2/auth',
                token_endpoint: tokenEndpointUrl,
                jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
                web_ui_client_id: 'testclientid',
                scopes: ['email', 'profile', 'openid'],
                has_web_ui_client_secret: true,
              },
            },
          ],
        });
      }
      console.log(url);
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=blablabla123&code=test12345',
        replace: (url) => {
          if (url.startsWith('com.gams.miro:')) {
            const urlParsed = new URL(url);
            expect(urlParsed.protocol).toBe('com.gams.miro:');
            expect(urlParsed.pathname).toBe('/auth/login');
            oAuthClient
              .decryptData(
                urlParsed.searchParams.get('jwt'),
                urlParsed.searchParams.get('aes_key'),
                urlParsed.searchParams.get('aes_iv'),
              )
              .then((jwt) => {
                expect(jwt).toBe('myaccesstoken');
              });
          }
          return null;
        },
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id === 'registrationData'
            ? null
            : JSON.stringify({
                state: 'blablabla123',
                isOidc: true,
                tokenEndpoint: tokenEndpointUrl,
                codeVerifier: 'mamama123',
                clientId: 'myclientid',
                nativeClientParams: {
                  id: 'com.gams.miro',
                  redirect_uri: '/auth/login',
                  public_key_b64: publicKey,
                },
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    axios.post.mockImplementation((url) =>
      url === tokenEndpointUrl
        ? Promise.resolve({
            status: 200,
            data: { id_token: 'myidtoken' },
          })
        : url.endsWith('/auth/oidc-providers/login')
          ? Promise.resolve({
              status: 200,
              data: { token: 'myaccesstoken' },
            })
          : null,
    );
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(axios.post).toBeCalledWith('/api/auth/oidc-providers/login', {
        expires_in: expect.any(Number),
        id_token: 'myidtoken',
      });
      expect(
        screen.getByText(
          'Authentication successful. You can now close this window.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('redirects with filtered scopes for a plain OAuth2 (non-OIDC) provider', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/password-policy')) {
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
      }
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({
          status: 200,
          data: [
            {
              name: 'plainoauth',
              label: 'Plain OAuth',
              is_main_identity_provider: false,
              is_ldap_identity_provider: false,
              oauth2: {
                authorization_endpoint: 'https://oauth.example.com/authorize',
                token_endpoint: 'https://oauth.example.com/token',
                web_ui_client_id: 'oauthclientid',
                has_web_ui_client_secret: false,
                scopes: [
                  { scope: 'JOBS', request_scope: 'jobs_scope' },
                  {
                    scope: 'NOT_A_DEFAULT_SCOPE',
                    request_scope: 'ignored_scope',
                  },
                ],
              },
            },
          ],
        });
      }
      console.log(url);
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        replace: vi.fn(() => null),
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        setItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    const oauthButton = await screen.findByText('Plain OAuth');
    await user.click(oauthButton);
    await waitFor(() => {
      expect(window.location.replace).toBeCalledWith(
        expect.stringMatching(
          /^https:\/\/oauth\.example\.com\/authorize\?response_type=code&client_id=oauthclientid&scope=jobs_scope&state=/,
        ),
      );
      expect(window.location.replace).not.toBeCalledWith(
        expect.stringContaining('ignored_scope'),
      );
      expect(window.sessionStorage.setItem).toBeCalledWith(
        'authParams',
        expect.stringMatching(/"isOidc":false/),
      );
    });
  });

  it('shows an internal error when no code is returned from the OAuth provider', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=teststate001',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'teststate001',
                isOidc: false,
                clientId: 'x',
                tokenEndpoint: 'http://tokenendpoint.example.com',
                codeVerifier: 'y',
                hasClientSecret: false,
                name: 'p',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Internal error while retrieving authentication token from OAuth provider.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows an internal error when the OIDC provider does not return an id token', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    const tokenEndpointUrl = 'http://tokenendpoint.example.com/oidc';
    axios.post.mockImplementation((url) =>
      url === tokenEndpointUrl
        ? Promise.resolve({ status: 200, data: {} })
        : Promise.resolve({ status: 200, data: {} }),
    );
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=teststate002&code=authcode1',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'teststate002',
                isOidc: true,
                clientId: 'x',
                tokenEndpoint: tokenEndpointUrl,
                codeVerifier: 'y',
                hasClientSecret: false,
                name: 'p',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Internal error while retrieving id token from OpenID Connect provider.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows an internal error when the OAuth2 provider does not return an access token', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    const tokenEndpointUrl = 'http://tokenendpoint.example.com/oauth2';
    axios.post.mockImplementation((url) =>
      url === tokenEndpointUrl
        ? Promise.resolve({ status: 200, data: {} })
        : Promise.resolve({ status: 200, data: {} }),
    );
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=teststate003&code=authcode2',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'teststate003',
                isOidc: false,
                clientId: 'x',
                tokenEndpoint: tokenEndpointUrl,
                codeVerifier: 'y',
                hasClientSecret: false,
                name: 'p',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Internal error while retrieving authentication token from OAuth provider.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('completes login carrying refresh token data when the provider has a client secret', async () => {
    const tokenEndpointUrl = 'http://tokenendpoint.example.com/secret';
    const setLogin = vi.fn();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      if (url.endsWith('/users/')) {
        return Promise.resolve({
          status: 200,
          data: [{ roles: ['admin'], username: 'someone' }],
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    axios.post.mockImplementation((url) =>
      url === tokenEndpointUrl
        ? Promise.resolve({
            status: 200,
            data: {
              access_token: 'myaccesstoken',
              refresh_token: 'myrefreshtoken',
            },
          })
        : Promise.resolve({ status: 200, data: {} }),
    );
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=teststate004&code=authcode3',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'teststate004',
                isOidc: false,
                clientId: 'myclientid',
                tokenEndpoint: tokenEndpointUrl,
                codeVerifier: 'verifier1',
                hasClientSecret: true,
                name: 'provider-name-x',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{
            login: false,
            server: 'http://localhost',
            setLogin,
          }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });
    await waitFor(() => {
      expect(setLogin).toBeCalledWith(
        expect.objectContaining({
          jwt: 'myaccesstoken',
          isOAuthToken: true,
          roles: ['admin'],
          username: 'someone',
          refreshTokenData: {
            clientId: 'myclientid',
            refreshTokenEndpoint: tokenEndpointUrl,
            refreshToken: 'myrefreshtoken',
          },
        }),
      );
    });
    const tokenCall = axios.post.mock.calls.find(
      ([url]) => url === tokenEndpointUrl,
    );
    expect(tokenCall[1].toString()).toContain(
      'identity_provider_name=provider-name-x',
    );
    expect(tokenCall[1].toString()).not.toContain('grant_type');
  });

  it('completes login without refresh token data when the provider does not return one', async () => {
    const tokenEndpointUrl = 'http://tokenendpoint.example.com/norefresh';
    const setLogin = vi.fn();
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      if (url.endsWith('/users/')) {
        return Promise.resolve({
          status: 200,
          data: [{ roles: ['admin'], username: 'someoneelse' }],
        });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    axios.post.mockImplementation((url) =>
      url === tokenEndpointUrl
        ? Promise.resolve({
            status: 200,
            data: {
              access_token: 'myaccesstokennorefresh',
            },
          })
        : Promise.resolve({ status: 200, data: {} }),
    );
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=teststate007&code=authcode5',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'teststate007',
                isOidc: false,
                clientId: 'myclientid2',
                tokenEndpoint: tokenEndpointUrl,
                codeVerifier: 'verifier2',
                hasClientSecret: false,
                name: 'provider-name-y',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{
            login: false,
            server: 'http://localhost',
            setLogin,
          }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });
    await waitFor(() => {
      expect(setLogin).toBeCalledWith(
        expect.objectContaining({
          jwt: 'myaccesstokennorefresh',
          isOAuthToken: true,
          roles: ['admin'],
          username: 'someoneelse',
          refreshTokenData: null,
        }),
      );
    });
  });

  it('shows an error message when the token endpoint request fails', async () => {
    const tokenEndpointUrl = 'http://tokenendpoint.example.com/fails';
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    axios.post.mockImplementation((url) =>
      url === tokenEndpointUrl
        ? Promise.reject(new Error('network fail'))
        : Promise.resolve({ status: 200, data: {} }),
    );
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=teststate005&code=authcode4',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'teststate005',
                isOidc: false,
                clientId: 'x',
                tokenEndpoint: tokenEndpointUrl,
                codeVerifier: 'y',
                hasClientSecret: false,
                name: 'p',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          'Problems retrieving authentication token from OAuth provider. Error message: network fail.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows an error when the state parameter does not match', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    Object.defineProperty(window, 'location', {
      value: {
        search: '?state=wrongstate',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'differentstate',
                isOidc: false,
                clientId: 'x',
                tokenEndpoint: 'http://tokenendpoint.example.com/mismatch',
                codeVerifier: 'y',
                hasClientSecret: false,
                name: 'p',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(
        screen.getByText('OAuth2 error: Invalid state parameter.'),
      ).toBeInTheDocument();
    });
  });

  it('shows the provider error description when the OAuth provider returns an error', async () => {
    axios.get.mockImplementation((url) => {
      if (url.endsWith('/auth/providers')) {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.resolve({ status: 200, data: {} });
    });
    Object.defineProperty(window, 'location', {
      value: {
        search:
          '?state=matchstate6&error=access_denied&error_description=User%20denied%20access',
        origin: 'http://localhost',
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: vi.fn((id) =>
          id !== 'authParams'
            ? null
            : JSON.stringify({
                state: 'matchstate6',
                isOidc: false,
                clientId: 'x',
                tokenEndpoint: 'http://tokenendpoint.example.com/errorflow',
                codeVerifier: 'y',
                hasClientSecret: false,
                name: 'p',
              }),
        ),
        removeItem: vi.fn(() => null),
      },
      writable: true,
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => {
      expect(screen.getByText('User denied access')).toBeInTheDocument();
    });
  });
});
