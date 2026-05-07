import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Jobs from '../components/Jobs';
import axios from 'axios';

vi.mock('axios');

describe('Jobs', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders Jobs correctly', async () => {
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('New Job'));
  });

  it('changes tag expanded when clicked', async () => {
    const user = userEvent.setup();
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });

    const maximizeButtons = await screen.findAllByRole('button', {
      name: /expand tag column/i,
    });
    await user.click(maximizeButtons[0]);

    const minimizeButton = (
      await screen.findAllByRole('button', {
        name: /minimize tag column/i,
        hidden: false,
      })
    )[0];

    expect(minimizeButton).toBeInTheDocument();
    user.click(minimizeButton);

    const maximizeButtonsNew = await screen.findAllByRole('button', {
      name: /expand tag column/i,
    });
    expect(maximizeButtonsNew[0]).toBeInTheDocument();
  });
});
