import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import axios from 'axios';

import AuthProvider from '../providers/AuthProvider';
import AuthContext from '../contexts/AuthContext';

vi.mock('axios');

// Dummy consumer exposing setLogin so tests can simulate a login and trigger
// the effect that registers the request/response interceptors.
const DummyConsumer = () => {
  const [login, setLogin] = useContext(AuthContext);

  return (
    <div>
      <span data-testid="login">{JSON.stringify(login)}</span>
      <button
        type="button"
        data-testid="login-button"
        onClick={() =>
          setLogin({
            jwt: 'jwt1',
            server: 'https://engine.example.com/api',
            refreshTokenData: {
              refreshToken: 'refresh1',
              clientId: 'client1',
              refreshTokenEndpoint: 'https://idp.example.com/token',
            },
          })
        }
      >
        login
      </button>
    </div>
  );
};

// axios's request/response InterceptorManagers share the same `use` method
// on their prototype, so under automocking `axios.interceptors.request.use`
// and `axios.interceptors.response.use` resolve to the SAME mock function,
// sharing one `.mock.calls` array. AuthProvider registers the request
// interceptor first, then the response interceptor, so call 0 is always the
// request pair and call 1 is always the response pair.
const loginAndGetInterceptors = async (user) => {
  render(
    <AuthProvider>
      <DummyConsumer />
    </AuthProvider>,
  );
  await user.click(screen.getByTestId('login-button'));
  const calls = axios.interceptors.request.use.mock.calls;
  const [requestFulfilled] = calls[0];
  const [, responseRejected] = calls[1];
  return { requestFulfilled, responseRejected };
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('attaches the bearer token to requests targeting the configured server', async () => {
    const user = userEvent.setup();
    const { requestFulfilled } = await loginAndGetInterceptors(user);

    const config = {
      url: 'https://engine.example.com/api/namespaces/',
      headers: {},
    };
    const result = requestFulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer jwt1');
  });

  it('does not attach the bearer token to a lookalike host', async () => {
    const user = userEvent.setup();
    const { requestFulfilled } = await loginAndGetInterceptors(user);

    const config = {
      url: 'https://engine.example.com.attacker.tld/api/namespaces/',
      headers: {},
    };
    const result = requestFulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('does not attach the bearer token to an unrelated origin', async () => {
    const user = userEvent.setup();
    const { requestFulfilled } = await loginAndGetInterceptors(user);

    const config = {
      url: 'https://attacker.tld/steal',
      headers: {},
    };
    const result = requestFulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('retries a 401 with the newly refreshed token after a successful refresh', async () => {
    const user = userEvent.setup();
    const { responseRejected } = await loginAndGetInterceptors(user);

    axios.post.mockResolvedValue({
      data: { access_token: 'jwt2' },
    });
    axios.mockResolvedValue({ data: 'retried response' });

    const config = {
      url: 'https://engine.example.com/api/namespaces/',
      headers: {},
    };
    const error = {
      config,
      request: {
        responseURL: 'https://engine.example.com/api/namespaces/',
      },
      response: { status: 401 },
    };

    // responseRejected is invoked directly here (not via a real request or
    // user interaction), so its internal setLogin/setState calls need an
    // explicit act() wrapper.
    let result;
    await act(async () => {
      result = await responseRejected(error);
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://idp.example.com/token',
      expect.any(URLSearchParams),
    );
    // The retried request must use the freshly refreshed token
    expect(config.headers.Authorization).toBe('Bearer jwt2');
    expect(result).toEqual({ data: 'retried response' });
  });

  it('does not treat a 401 from an unrelated origin as our own session expiring', async () => {
    const user = userEvent.setup();
    const { responseRejected } = await loginAndGetInterceptors(user);

    const error = {
      config: { url: 'https://attacker.tld/steal', headers: {} },
      request: { responseURL: 'https://attacker.tld/steal' },
      response: { status: 401 },
    };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(axios.post).not.toHaveBeenCalled();
    // An unrelated-origin 401 must not trigger our refresh/logout logic.
    expect(screen.getByTestId('login')).not.toHaveTextContent('false');
  });

  it('falls back to a logged-out state instead of crashing when localStorage holds malformed JSON', () => {
    localStorage.setItem('login', 'not valid json{');

    render(
      <AuthProvider>
        <DummyConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('login')).toHaveTextContent('false');
  });
});
