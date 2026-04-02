import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import TextEntryView from '../components/TextEntryView';
import axios from 'axios';

vi.mock('axios');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router-dom';

describe('TextEntryView', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ token: 'token1234' });

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/jobs/token1234/text-entry':
          return Promise.resolve({
            status: 200,
            data: {
              entry_name: 'string',
              entry_value: 'string',
              entry_size: 0,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders TextEntryView correctly', async () => {
    render(
      <TextEntryView
        textEntries={[{ entry_name: 'string', entry_value: '' }]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Text Entries'));
  });
});
