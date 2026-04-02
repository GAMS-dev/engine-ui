import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserSettingsForm from '../components/UserSettingsForm';
import UserSettingsFormGeneral from '../components/UserSettingsFormGeneral';
import UserSettingsFormWebPush from '../components/UserSettingsFormWebPush';
import { Navigate, Route, Routes } from 'react-router-dom';

const AllProvidersWrapper = ({
  children,
  options = { in_kubernetes: false },
}) => (
  <AllProvidersWrapperDefault options={options}>
    {children}
  </AllProvidersWrapperDefault>
);

describe('UserSettingsForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders UserSettingsForm', () => {
    render(
      <Routes>
        <Route path="/settings" element={<UserSettingsForm />}>
          <Route path="general" element={<UserSettingsFormGeneral />} />
          <Route path="notifications" element={<UserSettingsFormWebPush />} />
          <Route index element={<Navigate to="general" replace />} />
        </Route>
      </Routes>,
      {
        wrapper: AllProvidersWrapper,
      },
    );
  });

  it('userSettingsContext is correctly updated when settings change', async () => {
    render(
      <Routes>
        <Route path="/" element={<UserSettingsForm />}>
          <Route path="general" element={<UserSettingsFormGeneral />} />
          <Route path="notifications" element={<UserSettingsFormWebPush />} />
          <Route index element={<Navigate to="general" replace />} />
        </Route>
      </Routes>,
      {
        wrapper: AllProvidersWrapper,
      },
    );

    const selectControl = await screen.findByLabelText(
      /Default table page length/i,
    );

    await user.click(selectControl);
    const option = await screen.findByText('20');
    await user.click(option);
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('Cant edit notifications if webhooks not enabled', async () => {
    render(
      <Routes>
        <Route path="/" element={<UserSettingsForm />}>
          <Route path="general" element={<UserSettingsFormGeneral />} />
          <Route path="notifications" element={<UserSettingsFormWebPush />} />
          <Route index element={<Navigate to="general" replace />} />
        </Route>
      </Routes>,
      {
        wrapper: AllProvidersWrapper,
      },
    );

    await user.click(screen.getByText('Notifications'));
    await waitFor(() =>
      screen.getByText('Push notifications require webhooks to be enabled.'),
    );
  });

  it('Cant edit notifications if push notifications not supported by browser', async () => {
    render(
      <Routes>
        <Route path="/" element={<UserSettingsForm />}>
          <Route path="general" element={<UserSettingsFormGeneral />} />
          <Route path="notifications" element={<UserSettingsFormWebPush />} />
          <Route index element={<Navigate to="general" replace />} />
        </Route>
      </Routes>,
      {
        wrapper: ({ children }) => (
          <AllProvidersWrapper
            options={{
              in_kubernetes: false,
              serverConfig: { webhook_access: 'ENABLED' },
            }}
          >
            {children}
          </AllProvidersWrapper>
        ),
      },
    );

    await user.click(screen.getByText('Notifications'));
    await waitFor(() =>
      screen.getByText('Push notifications are not supported by your browser.'),
    );
  });
});
