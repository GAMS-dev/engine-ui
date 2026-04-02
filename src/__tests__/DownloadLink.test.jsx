import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DownloadLink from '../components/DownloadLink';
import axios from 'axios';

vi.mock('axios');

describe('DownloadLink', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({
      status: 200,
      data: 'someData',
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

  it('renders DownloadLink correctly', async () => {
    render(<DownloadLink url="download/url" />);
    await expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
