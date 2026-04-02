import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import QuotaWidget from '../components/QuotaWidget';
import axios from 'axios';

vi.mock('axios');

describe('QuotaWidget', () => {
  beforeEach(() => {
    axios.mockImplementation((params) => {
      switch (params.url) {
        case 'testserver/usage/quota':
          return Promise.resolve({ status: 200, data: [] });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    // Mock the CancelToken source and axios get method
    const cancel = vi.fn();
    axios.isCancel = vi.fn();

    // You can also mock CancelToken source if needed
    axios.CancelToken.source = vi.fn(() => ({
      token: { cancel },
      cancel,
    }));
  });

  it('renders QuotaWidget correctly', async () => {
    render(<QuotaWidget />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Quotas/));
  });
});
