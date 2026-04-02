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
});
