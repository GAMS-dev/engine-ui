import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import RemoveAuthProviderModal from '../components/RemoveAuthProviderModal';

vi.mock('axios');

describe('RemoveAuthProviderModal', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders RemoveAuthProviderModal correctly', async () => {
    render(<RemoveAuthProviderModal showDialog={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Please Confirm'));
  });

  it('displays the provider id being removed', async () => {
    render(
      <RemoveAuthProviderModal showDialog={true} providerId="my-provider" />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Please Confirm'));
    expect(screen.getByText('my-provider')).toBeInTheDocument();
  });

  it('clicking Cancel clears any error and calls setShowDialog(false)', async () => {
    const setShowDialog = vi.fn();
    render(
      <RemoveAuthProviderModal
        showDialog={true}
        providerId="my-provider"
        setShowDialog={setShowDialog}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Please Confirm'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(setShowDialog).toHaveBeenCalledWith(false);
  });

  it('removes the identity provider, alerts success and refreshes the list', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefreshProviders = vi.fn();
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <RemoveAuthProviderModal
          showDialog={true}
          providerId="my-provider"
          setShowDialog={vi.fn()}
          setRefreshProviders={setRefreshProviders}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Please Confirm'));
    await user.click(
      screen.getByRole('button', { name: 'Remove Identity Provider' }),
    );

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('testserver/auth/providers', {
        params: {
          name: 'my-provider',
        },
      }),
    );
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'success:Identity provider: my-provider removed successfully!',
      ),
    );
    expect(setRefreshProviders).toHaveBeenCalled();
  });

  it('shows an error message when removing the identity provider fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));

    render(
      <RemoveAuthProviderModal
        showDialog={true}
        providerId="my-provider"
        setShowDialog={vi.fn()}
        setRefreshProviders={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Please Confirm'));
    await user.click(
      screen.getByRole('button', { name: 'Remove Identity Provider' }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          'Some error occurred while trying to remove the identity provider: my-provider. Error message: Test error.',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('clears a previous error message when the dialog is closed via Cancel', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));
    const setShowDialog = vi.fn();

    render(
      <RemoveAuthProviderModal
        showDialog={true}
        providerId="my-provider"
        setShowDialog={setShowDialog}
        setRefreshProviders={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Please Confirm'));
    await user.click(
      screen.getByRole('button', { name: 'Remove Identity Provider' }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Test error/)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(setShowDialog).toHaveBeenCalledWith(false);
    expect(screen.queryByText(/Test error/)).not.toBeInTheDocument();
  });
});
