import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import WebhooksActionsButtonGroup from '../components/WebhooksActionsButtonGroup';

vi.mock('axios');

describe('WebhooksActionsButtonGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  it('renders WebhooksActionsButtonGroup correctly', async () => {
    render(<WebhooksActionsButtonGroup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByText(/Delete/));
    expect(
      screen.getByText(/Are you sure you want to remove the webhook /),
    ).toBeInTheDocument();
  });

  it('does not show the Copy URL button when url is not set', () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });
    render(<WebhooksActionsButtonGroup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(
      screen.queryByRole('button', { name: 'Copy URL' }),
    ).not.toBeInTheDocument();
  });

  it('does not show the Copy URL button in an insecure context', () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: false,
    });
    render(<WebhooksActionsButtonGroup url="https://example.com/hook" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(
      screen.queryByRole('button', { name: 'Copy URL' }),
    ).not.toBeInTheDocument();
  });

  it('copies the URL to the clipboard and shows a success alert', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <WebhooksActionsButtonGroup url="https://example.com/hook" />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Copy URL' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://example.com/hook',
    );
    expect(setAlertMsg).toHaveBeenCalledWith(
      'success:URL copied to clipboard!',
    );
  });

  it('cancel closes the confirm dialog', async () => {
    render(<WebhooksActionsButtonGroup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Please confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please confirm')).not.toBeInTheDocument(),
    );
  });

  it('removes the webhook successfully and refreshes', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <WebhooksActionsButtonGroup
        id="hook-1"
        server="testserver"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Remove Webhook' }));

    await waitFor(() =>
      expect(screen.queryByText('Please confirm')).not.toBeInTheDocument(),
    );
    expect(axios.delete).toHaveBeenCalledWith('testserver/users/webhooks', {
      params: { id: 'hook-1' },
    });
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows an error message and keeps the dialog open when removal fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));

    render(
      <WebhooksActionsButtonGroup
        id="hook-1"
        server="testserver"
        setRefresh={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Remove Webhook' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems deleting webhook. Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Please confirm')).toBeInTheDocument();
  });
});
