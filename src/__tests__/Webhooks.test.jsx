import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import Webhooks from '../components/Webhooks';
import axios from 'axios';

vi.mock('axios');

describe('Webhooks', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/users/webhooks':
          return Promise.resolve({
            status: 200,
            data: [
              {
                id: 0,
                username: 'John',
                url: 'https://www.example.com',
                content_type: 'form',
                events: ['ALL'],
                parameterized_events: [
                  {
                    event: 'ALL',
                    parameters: ['string'],
                  },
                ],
                recursive: true,
                insecure_ssl: true,
                created_at: '2021-08-04T17:10:15.000000+00:00',
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders Webhooks correctly', async () => {
    render(<Webhooks />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Webhooks'));
  });

  it('trims long payload URLs and hides web push-only webhooks until "Show All" is clicked', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/users/webhooks':
          return Promise.resolve({
            status: 200,
            data: [
              {
                id: 1,
                username: 'Alice',
                url: 'https://example.com/foo/bar',
                events: ['ALL'],
                parameterized_events: [],
                recursive: false,
                created_at: '2021-08-04T17:10:15.000000+00:00',
              },
              {
                id: 2,
                username: 'Bob',
                url: null,
                events: ['ALL'],
                parameterized_events: [],
                recursive: false,
                created_at: '2021-08-04T17:11:15.000000+00:00',
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<Webhooks />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await screen.findByText('Alice');
    expect(screen.getByTitle('https://example.com/foo/bar')).toHaveTextContent(
      'https://example.com/foo****',
    );
    // Web push-only webhook (no url) is filtered out by default.
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Show All/ }));

    const bobRow = (await screen.findByText('Bob')).closest('tr');
    expect(
      screen.getByRole('button', { name: /Hide Web Push-only/ }),
    ).toBeInTheDocument();
    // The Payload URL displayer returns '' for webhooks without a url.
    expect(within(bobRow).queryByText(/http/)).not.toBeInTheDocument();
  });

  it('shows the disabled message and does not fetch webhooks when webhook access is disabled', async () => {
    render(<Webhooks />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{ serverConfig: { webhook_access: 'DISABLED' } }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    expect(
      await screen.findByText('Webhooks/Web Push disabled'),
    ).toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalledWith('testserver/users/webhooks');
    expect(
      screen.getByRole('button', { name: 'Enable Webhooks' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Disable Webhooks' }),
    ).not.toBeInTheDocument();
  });

  it('shows an alert and stops loading when fetching webhooks fails', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/users/webhooks':
          return Promise.reject(new Error('boom'));
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <Webhooks />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems fetching webhooks. Error message: boom',
      ),
    );
    expect(screen.getByText('No Webhooks Found')).toBeInTheDocument();
  });

  it('re-fetches webhooks when Refresh is clicked', async () => {
    render(<Webhooks />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await screen.findByText('John');

    const callsBefore = axios.get.mock.calls.filter(
      ([url]) => url === 'testserver/users/webhooks',
    ).length;

    await user.click(screen.getByRole('button', { name: /Refresh/ }));

    await waitFor(() => {
      const callsAfter = axios.get.mock.calls.filter(
        ([url]) => url === 'testserver/users/webhooks',
      ).length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  it('enables webhooks for admins only and closes the dialog', async () => {
    const setServerConfig = vi.fn();

    render(<Webhooks />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ setServerConfig }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await user.click(screen.getByRole('button', { name: 'Enable Webhooks' }));
    expect(
      screen.getByText('Are you sure that you want to enable webhooks?'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Enable for admins only' }),
    );

    expect(setServerConfig).toHaveBeenCalledWith({
      webhook_access: 'ADMIN_ONLY',
    });
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('enables webhooks for everyone', async () => {
    const setServerConfig = vi.fn();

    render(<Webhooks />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ setServerConfig }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await user.click(screen.getByRole('button', { name: 'Enable Webhooks' }));
    await user.click(
      screen.getByRole('button', { name: 'Enable for everyone' }),
    );

    expect(setServerConfig).toHaveBeenCalledWith({
      webhook_access: 'ENABLED',
    });
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('shows an error message and keeps the dialog open when disabling webhooks fails', async () => {
    const setServerConfig = vi.fn().mockRejectedValue(new Error('Test error'));

    render(<Webhooks />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ setServerConfig }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await user.click(screen.getByRole('button', { name: 'Disable Webhooks' }));
    expect(
      screen.getByText('Are you sure that you want to disable webhooks?'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disable' }));

    expect(setServerConfig).toHaveBeenCalledWith({
      webhook_access: 'DISABLED',
    });
    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems updating webhook access configuration. Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();
  });

  it('closes the confirmation dialog via Cancel and via the close button', async () => {
    render(<Webhooks />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await user.click(screen.getByRole('button', { name: 'Enable Webhooks' }));
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Enable Webhooks' }));
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });
});
