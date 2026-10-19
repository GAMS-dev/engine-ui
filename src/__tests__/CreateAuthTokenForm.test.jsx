import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { MantineProvider } from '@mantine/core';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import CreateAuthTokenForm from '../components/CreateAuthTokenForm';
import AuthContext from '../contexts/AuthContext';
import axios from 'axios';

vi.mock('axios');

const ALL_SCOPES =
  'CONFIGURATION NAMESPACES JOBS HYPERCUBE USERS CLEANUP USAGE LICENSES AUTH';

describe('CreateAuthTokenForm', () => {
  beforeEach(() => {
    axios.post.mockImplementation((url) => {
      switch (url) {
        case 'testserver/auth/':
          return Promise.resolve({
            status: 200,
            data: {
              token: 'generated-token-abc123',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    // Mock the CancelToken source and axios get method
    const cancel = vi.fn();
    axios.isCancel = vi.fn();

    // You can also mock CancelToken source if needed
    axios.CancelToken.source = vi.fn(() => ({
      token: { cancel },
      cancel,
    }));
  });

  it('renders CreateAuthTokenForm correctly', async () => {
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));
  });

  it('submits the form with default values and displays the generated token', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(
      'testserver/auth/',
      expect.any(FormData),
    );
    const formData = axios.post.mock.calls[0][1];
    // No scopes selected and not readonly => empty scope string.
    expect(formData.get('scope')).toBe('');
    // Default expiration is ~7 days from now.
    expect(Number(formData.get('expires_in'))).toBeGreaterThan(604000);
    expect(Number(formData.get('expires_in'))).toBeLessThanOrEqual(604800);

    await screen.findByText('Your generated authentication token:');
    expect(
      screen.getByDisplayValue('generated-token-abc123'),
    ).toBeInTheDocument();
  });

  it('changes the expiration date via the date picker and clamps to the minimum duration', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    const dateInput = document.querySelector('button[data-dates-input]');
    await user.click(dateInput);
    // The calendar opens on the default's month, which may be next month.
    if (!document.querySelector('button[data-today]')) {
      await user.click(
        document.querySelector('button[data-direction="previous"]'),
      );
    }
    // Today is far closer than the default 7 days, so the duration clamps to minSeconds.
    await user.click(document.querySelector('button[data-today]'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('expires_in')).toBe('60');
  });

  it('sends the selected access scopes when scopes are chosen', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await selectEvent.select(screen.getByLabelText('Access Scopes'), [
      'Jobs',
      'Users',
    ]);

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('scope')).toBe('JOBS USERS');
  });

  it('adds READONLY plus all available scopes when readonly is checked with no scopes selected', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(screen.getByLabelText('Readonly access'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('scope')).toBe(`${ALL_SCOPES} READONLY`);
  });

  it('adds READONLY to only the selected scopes when readonly is checked with scopes selected', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await selectEvent.select(screen.getByLabelText('Access Scopes'), [
      'Jobs',
      'Users',
    ]);
    await user.click(screen.getByLabelText('Readonly access'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('scope')).toBe('JOBS USERS READONLY');
  });

  it('shows field-specific validation errors returned by the server', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          errors: {
            expires_in: 'Invalid expiration date.',
            scope: 'Invalid scope value.',
          },
        },
      },
    });
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await screen.findByText('Problems creating authentication token.');
    expect(screen.getByText('Invalid expiration date.')).toBeInTheDocument();
    expect(screen.getByText('Invalid scope value.')).toBeInTheDocument();
  });

  it('shows a generic error message when the server response has no field errors', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Something went wrong on the server.',
        },
      },
    });
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await screen.findByText(
      'Problems creating authentication token. Error message: Something went wrong on the server.',
    );
  });

  it('does not render a Copy button when not in a secure context', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await screen.findByText('Your generated authentication token:');
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('copies the generated token to the clipboard and shows temporary feedback', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );
    await screen.findByText('Your generated authentication token:');

    const copyButton = screen.getByRole('button', { name: 'Copy' });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledWith('generated-token-abc123');
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();

    // The "Copied!" feedback reverts back to "Copy" after 2 seconds.
    await waitFor(() => screen.getByRole('button', { name: 'Copy' }), {
      timeout: 3000,
    });
  });

  it('returns to the form when the Done button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );
    await screen.findByText('Your generated authentication token:');

    await user.click(screen.getByRole('button', { name: 'Done' }));

    await screen.findByText('Expiration Date');
    expect(
      screen.queryByText('Your generated authentication token:'),
    ).toBeNull();
  });

  it('does not offer the AUTH scope when authenticated with an OAuth token', async () => {
    const user = userEvent.setup();
    render(
      <MantineProvider env="test">
        <AuthContext.Provider
          value={[{ server: 'testserver', isOAuthToken: true }, vi.fn()]}
        >
          <CreateAuthTokenForm />
        </AuthContext.Provider>
      </MantineProvider>,
    );
    await waitFor(() => screen.findByText('Expiration Date'));

    await user.click(screen.getByLabelText('Access Scopes'));

    expect(screen.queryByText('Authentication')).toBeNull();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
  });

  it('clears the scope selection when the select is cleared', async () => {
    const user = userEvent.setup();
    render(<CreateAuthTokenForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Expiration Date'));

    await selectEvent.select(screen.getByLabelText('Access Scopes'), [
      'Jobs',
      'Users',
    ]);
    const clearButton = document.querySelectorAll(
      '[class*="indicatorContainer"]',
    )[0];
    await user.click(clearButton);

    await user.click(
      screen.getByRole('button', { name: 'Create Authentication Token' }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('scope')).toBe('');
  });
});
