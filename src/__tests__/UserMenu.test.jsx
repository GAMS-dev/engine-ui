import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserMenu from '../components/UserMenu';

describe('UserMenu', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders UserMenu correctly', async () => {
    render(<UserMenu />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Usage')).toBeInTheDocument();
  });
});
