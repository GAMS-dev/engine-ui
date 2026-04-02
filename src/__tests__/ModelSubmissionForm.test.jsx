import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import ModelSubmissionForm from '../components/ModelSubmissionForm';
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

describe('ModelSubmissionForm', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({
      modelname: 'transport',
      namespace: 'global',
    });

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/namespaces/global':
          return Promise.resolve({
            status: 200,
            data: [],
          });
        case 'testserver/namespaces/global/user-groups':
          return Promise.resolve({
            status: 200,
            data: [
              {
                label: 'string',
                created_at: '2021-08-04T17:10:15.000000+00:00',
                created_by: {
                  username: 'string',
                  deleted: true,
                  old_username: 'string',
                },
                owned_by: 'string',
                members: [
                  {
                    username: 'string',
                    added_at: '2021-08-04T17:10:15.000000+00:00',
                    added_by: {
                      username: 'string',
                      deleted: true,
                      old_username: 'string',
                    },
                  },
                ],
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });
  it('renders ModelSubmissionForm correctly', async () => {
    render(<ModelSubmissionForm namespace={{ permission: 110 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update model/));
  });
});
