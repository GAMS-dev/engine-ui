import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '@testing-library/jest-dom';
import axios from 'axios';
import LicUpdateButton from '../components/LicenseUpdateButton';
import { AllProvidersWrapperDefault } from './utils/testUtils';

vi.mock('axios');

describe('LicUpdateButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/licenses/engine':
          return Promise.resolve({
            status: 200,
            data: {
              license: null,
              expiration_date: null,
              usi: 'usiToken1234',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders LicUpdateButton correctly', async () => {
    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
  });

  it('renders the copy button in a secure context', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });

    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    expect(
      screen.getByRole('button', { name: 'Copy to clipboard' }),
    ).toBeInTheDocument();
  });

  it('does not render the copy button in an insecure context', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: false,
    });

    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    expect(
      screen.queryByRole('button', { name: 'Copy to clipboard' }),
    ).toBeNull();
  });

  it('copies the USI to the clipboard and shows a tooltip', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText: vi.fn() },
    });

    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('usiToken1234');
    await waitFor(() => screen.findByText('Copied!'));
  });

  it('renders the system-wide license dialog with its own settings', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/licenses/system-wide':
          return Promise.resolve({
            status: 200,
            data: { license: null, expiration_date: null, usi: null },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<LicUpdateButton type="system-wide" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update GAMS license/));
    await user.click(screen.getByText(/Update GAMS license/));

    await waitFor(() => screen.findByText('Update system-wide GAMS license'));
    expect(
      screen.getByLabelText('System-wide GAMS license'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Unique System Identifier/)).toBeNull();
  });

  it('shows an error message when fetching the license fails', async () => {
    axios.get.mockImplementation(() => Promise.reject(new Error('boom')));

    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    await waitFor(() =>
      screen.findByText(
        /An error occurred while fetching license\. Error message: boom\./,
      ),
    );
  });

  it('formats a multi-line engine license and submits it successfully', async () => {
    const longLicense = 'A'.repeat(100);
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/licenses/engine':
          return Promise.resolve({
            status: 200,
            data: {
              license: longLicense,
              expiration_date: null,
              usi: 'usiToken1234',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    axios.put.mockResolvedValue({ status: 200 });
    const setLicenseExpiration = vi.fn();

    render(
      <LicUpdateButton
        type="engine"
        setLicenseExpiration={setLicenseExpiration}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    const textarea = await screen.findByLabelText('Engine license');
    await waitFor(() => expect(textarea).not.toBeDisabled());
    expect(textarea.value).toContain('\n');

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put).toHaveBeenCalledWith(
      'testserver/licenses/engine',
      expect.anything(),
    );
    await waitFor(() =>
      expect(setLicenseExpiration).toHaveBeenCalledWith('perpetual'),
    );
    expect(screen.queryByText('Update system-wide GAMS license')).toBeNull();
  });

  it('shows an error when submitting an empty engine license', async () => {
    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    const textarea = await screen.findByLabelText('Engine license');
    await waitFor(() => expect(textarea).not.toBeDisabled());

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      screen.findByText('Cannot submit empty Engine license'),
    );
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('shows an error when submitting an empty system-wide license', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/licenses/system-wide':
          return Promise.resolve({
            status: 200,
            data: { license: null, expiration_date: null, usi: null },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<LicUpdateButton type="system-wide" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update GAMS license/));
    await user.click(screen.getByText(/Update GAMS license/));

    const textarea = await screen.findByLabelText('System-wide GAMS license');
    await waitFor(() => expect(textarea).not.toBeDisabled());

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => screen.findByText('Cannot submit empty GAMS license'));
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('shows an error message when updating the license fails', async () => {
    axios.put.mockRejectedValue(new Error('put failed'));

    render(<LicUpdateButton type="engine" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update Engine license/));
    await user.click(screen.getByText(/Update Engine license/));

    const textarea = await screen.findByLabelText('Engine license');
    await waitFor(() => expect(textarea).not.toBeDisabled());
    await user.type(textarea, 'some-license-text');

    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      screen.findByText(
        /An error occurred while updating license\. Error message: put failed\./,
      ),
    );
  });
});
