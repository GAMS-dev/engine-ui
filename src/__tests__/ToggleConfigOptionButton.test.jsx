import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import userEvent from '@testing-library/user-event';
import ToggleConfigOptionButton from '../components/ToggleConfigOptionButton';

vi.mock('axios');

describe('ToggleConfigOptionButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });
  it('renders ToggleConfigOptionButton correctly', async () => {
    render(<ToggleConfigOptionButton configKey="job_priorities_access" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByRole('button'));
    await waitFor(() => screen.findByText('Please Confirm'));
  });

  it('shows "Enable" label when the option is disabled', async () => {
    render(<ToggleConfigOptionButton configKey="job_priorities_access" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(
      screen.getByRole('button', { name: /Enable job priorities/ }),
    ).toBeInTheDocument();
  });

  it('shows "Disable" label when the option is already enabled', async () => {
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ serverConfig: { job_priorities_access: 'ENABLED' } }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<ToggleConfigOptionButton configKey="job_priorities_access" />, {
      wrapper: Wrapper,
    });
    expect(
      screen.getByRole('button', { name: /Disable job priorities/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Disable/ }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: /Confirm Disable/ }),
    ).toBeInTheDocument();
  });

  it('closes the confirmation dialog and clears the error message when cancelled', async () => {
    const updateServerConfig = vi.fn().mockRejectedValue(new Error('Boom'));
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ setServerConfig: updateServerConfig }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<ToggleConfigOptionButton configKey="job_priorities_access" />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByRole('button', { name: /Enable/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /Confirm Enable/ }),
    );
    expect(
      await within(dialog).findByText(/Problems updating configuration/),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );

    // Re-open the dialog and verify the previous error message was cleared.
    await user.click(screen.getByRole('button', { name: /Enable/ }));
    const reopenedDialog = await screen.findByRole('dialog');
    expect(
      within(reopenedDialog).queryByText(/Problems updating configuration/),
    ).not.toBeInTheDocument();
  });

  it('submits the confirmed toggle, updates the config, and closes the dialog on success', async () => {
    const updateServerConfig = vi.fn().mockResolvedValue();
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ setServerConfig: updateServerConfig }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<ToggleConfigOptionButton configKey="job_priorities_access" />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByRole('button', { name: /Enable/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /Confirm Enable/ }),
    );

    await waitFor(() =>
      expect(updateServerConfig).toHaveBeenCalledWith({
        job_priorities_access: 'ENABLED',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('shows a submission error inside the dialog when the confirmed update fails', async () => {
    const updateServerConfig = vi
      .fn()
      .mockRejectedValue(new Error('Something went wrong'));
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault
        options={{ setServerConfig: updateServerConfig }}
      >
        {children}
      </AllProvidersWrapperDefault>
    );
    render(<ToggleConfigOptionButton configKey="job_priorities_access" />, {
      wrapper: Wrapper,
    });

    await user.click(screen.getByRole('button', { name: /Enable/ }));
    const dialog = await screen.findByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', {
      name: /Confirm Enable/,
    });
    await user.click(confirmButton);

    expect(
      await within(dialog).findByText(
        /Problems updating configuration\. Error message: Something went wrong/,
      ),
    ).toBeInTheDocument();
    // Dialog should remain open so the user can retry or cancel.
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();
    expect(updateServerConfig).toHaveBeenCalledWith({
      job_priorities_access: 'ENABLED',
    });
  });
});
