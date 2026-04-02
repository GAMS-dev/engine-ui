import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import TerminateJobButton from '../components/TerminateJobButton';

vi.mock('axios');

describe('TerminateJobButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });
  it('renders TerminateJobButton correctly', async () => {
    render(<TerminateJobButton status={1} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByText(/Cancel/));
    await waitFor(() => screen.findByText('Please Confirm'));
  });
});
