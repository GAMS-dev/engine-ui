import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { Outlet, Route, Routes } from 'react-router';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserSettingsFormWebPush from '../components/UserSettingsFormWebPush';
import AlertContext from '../contexts/AlertContext';
import UserSettingsContext from '../contexts/UserSettingsContext';
import {
  allEvents,
  getPushSubscription,
  subscribe,
  unsubscribe,
  webpushSupported,
} from '../util/webpush';
import { isMobileDevice } from '../util/util';

vi.mock('../util/webpush', async () => {
  const actual = await vi.importActual('../util/webpush');
  return {
    ...actual,
    webpushSupported: vi.fn(),
    getPushSubscription: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
});

vi.mock('../util/util', async () => {
  const actual = await vi.importActual('../util/util');
  return {
    ...actual,
    isMobileDevice: vi.fn(actual.isMobileDevice),
  };
});

const renderComponent = ({
  setWebpushSettingsJSON = vi.fn(),
  setAlertMsg = vi.fn(),
  providerOptions = { serverConfig: { webhook_access: 'ENABLED' } },
  webPushSetting = undefined,
} = {}) => {
  render(
    <Routes>
      <Route element={<Outlet context={{ setWebpushSettingsJSON }} />}>
        <Route index element={<UserSettingsFormWebPush />} />
      </Route>
    </Routes>,
    {
      wrapper: ({ children }) => (
        <AlertContext.Provider value={['', setAlertMsg]}>
          <AllProvidersWrapperDefault options={providerOptions}>
            {webPushSetting ? (
              <UserSettingsContext.Consumer>
                {([userSettings, updateUserSettings]) => (
                  <UserSettingsContext.Provider
                    value={[
                      { ...userSettings, webPush: webPushSetting },
                      updateUserSettings,
                    ]}
                  >
                    {children}
                  </UserSettingsContext.Provider>
                )}
              </UserSettingsContext.Consumer>
            ) : (
              children
            )}
          </AllProvidersWrapperDefault>
        </AlertContext.Provider>
      ),
    },
  );
  return { setWebpushSettingsJSON, setAlertMsg };
};

describe('UserSettingsFormWebPush', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    webpushSupported.mockReturnValue(true);
    getPushSubscription.mockResolvedValue({ pushSubscription: null });
  });

  it('checks for an existing push subscription on mount and leaves the switch off when none exists', async () => {
    renderComponent();

    await waitFor(() =>
      expect(getPushSubscription).toHaveBeenCalledWith('testserver'),
    );
    expect(screen.getByLabelText('Enable notifications')).not.toBeChecked();
    expect(screen.queryByText('Update')).not.toBeInTheDocument();
  });

  it('shows the notification settings when an existing push subscription is found', async () => {
    getPushSubscription.mockResolvedValue({
      pushSubscription: { endpoint: 'https://existing-endpoint' },
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getByLabelText('Enable notifications')).toBeChecked(),
    );
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('All events')).toBeInTheDocument();
  });

  it('does not check for an existing subscription when the browser does not support web push', async () => {
    webpushSupported.mockReturnValue(false);

    renderComponent();

    await waitFor(() =>
      expect(
        screen.getByText(
          'Push notifications are not supported by your browser.',
        ),
      ).toBeInTheDocument(),
    );
    expect(getPushSubscription).not.toHaveBeenCalled();
  });

  it('enables the notification settings form without contacting the server when toggled on', async () => {
    renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    expect(switchInput).not.toBeChecked();
    expect(getPushSubscription).toHaveBeenCalledTimes(1);

    await user.click(switchInput);

    expect(switchInput).toBeChecked();
    expect(screen.getByText('Update')).toBeInTheDocument();
    // Enabling does not query the server or unsubscribe anything.
    expect(getPushSubscription).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes and hides the form when notifications are toggled off and a subscription exists', async () => {
    const pushSubscription = { endpoint: 'https://existing-endpoint' };
    getPushSubscription.mockResolvedValue({ pushSubscription });
    unsubscribe.mockResolvedValue(undefined);
    const { setWebpushSettingsJSON } = renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    await waitFor(() => expect(switchInput).toBeChecked());

    await user.click(switchInput);

    await waitFor(() => expect(switchInput).not.toBeChecked());
    expect(unsubscribe).toHaveBeenCalledWith(
      'testserver',
      pushSubscription,
      true,
    );
    expect(setWebpushSettingsJSON).toHaveBeenCalledWith(null);
    expect(screen.queryByText('Update')).not.toBeInTheDocument();
  });

  it('hides the form without unsubscribing when toggled off but no subscription remains', async () => {
    const pushSubscription = { endpoint: 'https://existing-endpoint' };
    getPushSubscription
      .mockResolvedValueOnce({ pushSubscription })
      .mockResolvedValueOnce({ pushSubscription: null });
    const { setWebpushSettingsJSON } = renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    await waitFor(() => expect(switchInput).toBeChecked());

    await user.click(switchInput);

    await waitFor(() => expect(switchInput).not.toBeChecked());
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(setWebpushSettingsJSON).toHaveBeenCalledWith(null);
  });

  it('shows an error message when toggling notifications off fails', async () => {
    const pushSubscription = { endpoint: 'https://existing-endpoint' };
    getPushSubscription
      .mockResolvedValueOnce({ pushSubscription })
      .mockRejectedValueOnce(new Error('Network unavailable'));
    renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    await waitFor(() => expect(switchInput).toBeChecked());

    await user.click(switchInput);

    await waitFor(() =>
      expect(screen.getByText('Network unavailable')).toBeInTheDocument(),
    );
    // Since the disable failed, the settings form should remain visible.
    expect(switchInput).toBeChecked();
  });

  it('submits selected events and shows a success alert when subscribing succeeds', async () => {
    subscribe.mockResolvedValue(undefined);
    const { setWebpushSettingsJSON, setAlertMsg } = renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    await user.click(switchInput);
    await user.click(screen.getByText('Update'));

    await waitFor(() =>
      expect(subscribe).toHaveBeenCalledWith('testserver', [allEvents[0]], []),
    );
    expect(setWebpushSettingsJSON).toHaveBeenCalledWith(
      JSON.stringify({ events: [allEvents[0]], parameterized_events: [] }),
    );
    expect(setAlertMsg).toHaveBeenCalledWith(
      'success:Notification settings updated',
    );
  });

  it('shows an error message and clears saved settings when subscribing fails', async () => {
    subscribe.mockRejectedValue(
      new Error('Push messaging request was denied.'),
    );
    const { setWebpushSettingsJSON, setAlertMsg } = renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    await user.click(switchInput);
    await user.click(screen.getByText('Update'));

    await waitFor(() =>
      expect(
        screen.getByText('Push messaging request was denied.'),
      ).toBeInTheDocument(),
    );
    expect(setWebpushSettingsJSON).toHaveBeenCalledWith(null);
    expect(setAlertMsg).not.toHaveBeenCalled();
  });

  it('includes newly selected events when submitting after changing the events selector', async () => {
    subscribe.mockResolvedValue(undefined);
    renderComponent();

    const switchInput = await screen.findByLabelText('Enable notifications');
    await user.click(switchInput);

    const eventsSelect = screen.getByLabelText(
      'Events for which notification should be triggered',
    );
    await user.click(eventsSelect);
    const option = await screen.findByText('Job finished');
    await user.click(option);

    await user.click(screen.getByText('Update'));

    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    const [server, submittedEvents] = subscribe.mock.calls[0];
    expect(server).toBe('testserver');
    expect(submittedEvents).toEqual(
      expect.arrayContaining([allEvents[0], allEvents[1]]),
    );
    expect(submittedEvents).toHaveLength(2);
  });

  it('restores previously saved events and parameterized events from user settings', async () => {
    getPushSubscription.mockResolvedValue({
      pushSubscription: { endpoint: 'https://existing-endpoint' },
    });
    subscribe.mockResolvedValue(undefined);
    renderComponent({
      webPushSetting: JSON.stringify({
        events: [allEvents[2]],
        parameterized_events: ['VOLUME_QUOTA_THRESHOLD=3600'],
      }),
    });

    await waitFor(() =>
      expect(screen.getByLabelText('Enable notifications')).toBeChecked(),
    );
    expect(screen.getByText('Hypercube job finished')).toBeInTheDocument();
    expect(
      screen.getByText('Volume quota threshold reached'),
    ).toBeInTheDocument();

    await user.click(screen.getByText('Update'));

    await waitFor(() =>
      expect(subscribe).toHaveBeenCalledWith(
        'testserver',
        [allEvents[2]],
        ['VOLUME_QUOTA_THRESHOLD=3600'],
      ),
    );
  });

  it('renders the notification form when webhook access is admin-only and the user is an admin', async () => {
    renderComponent({
      providerOptions: { serverConfig: { webhook_access: 'ADMIN_ONLY' } },
    });

    expect(
      await screen.findByLabelText('Enable notifications'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Push notifications require webhooks to be enabled.'),
    ).not.toBeInTheDocument();
  });

  it('requires webhooks to be enabled when webhook access is admin-only and the user is not an admin', async () => {
    renderComponent({
      providerOptions: {
        serverConfig: { webhook_access: 'ADMIN_ONLY' },
        roles: ['user'],
      },
    });

    expect(
      await screen.findByText(
        'Push notifications require webhooks to be enabled.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Enable notifications'),
    ).not.toBeInTheDocument();
  });

  it('suggests installing the app on mobile devices when web push is unsupported', async () => {
    webpushSupported.mockReturnValue(false);
    isMobileDevice.mockReturnValue(true);

    renderComponent();

    expect(
      await screen.findByText(/You may need to install the app first/),
    ).toBeInTheDocument();
  });
});
