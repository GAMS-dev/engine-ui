import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import RemoveAuthProviderModal from '../components/RemoveAuthProviderModal';

vi.mock('axios');

describe('RemoveAuthProviderModal', () => {
  it('renders RemoveAuthProviderModal correctly', async () => {
    render(<RemoveAuthProviderModal showDialog={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Please Confirm'));
  });
});
