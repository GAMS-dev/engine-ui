import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserChangeNameForm from '../components/UserChangeNameForm';

vi.mock('axios');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router-dom';

describe('UserChangeNameForm', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ user: 'user1' });
  });

  it('renders UserChangeNameForm correctly', async () => {
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Change Username of User: user1'));
  });
});
