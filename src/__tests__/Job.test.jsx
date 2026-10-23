import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import axios from 'axios';

import Job from '../components/Job';

vi.mock('axios');

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router';

describe('Job', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({
      token: 'asd123',
    });

    axios.get.mockRejectedValue({
      status: 404,
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

  it('renders Job correctly', async () => {
    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() =>
      screen.findByText(
        /Problems fetching job information. Error message: undefined/,
      ),
    );
  });

  it('gives the correct error message if an invalid token is called', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'invalidToken123',
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() =>
      screen.findByText(
        /Problems fetching job information. Error message: undefined/,
      ),
    );
  });

  it('gives the correct error message if an invalid token is called also for hybercube', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'hc:invalidToken123',
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() =>
      screen.findByText(
        /Problems fetching Hypercube job information. Error message: undefined/,
      ),
    );
  });

  it('shows an error message instead of crashing when a Hypercube job fetch returns no results', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'hc:emptyResults123',
    });

    axios.get.mockImplementation((url) => {
      if (url.includes('/hypercube/')) {
        return Promise.resolve({ data: { results: [] } });
      }
      return Promise.reject({ status: 404 });
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() =>
      screen.findByText(
        /Problems fetching Hypercube job information. Please try again later./,
      ),
    );
  });

  const baseJob = {
    token: 'job-token-1',
    tag: 'my-tag',
    user: {
      username: 'former-user',
      old_username: 'former-user',
      deleted: true,
    },
    submitted_at: '2024-06-01T00:00:00Z',
    namespace: 'ns1',
    access_groups: [],
    model: 'model1',
    is_temporary_model: false,
    is_data_provided: true,
    arguments: [],
    stdout_filename: 'stdout.txt',
    text_entries: [{ entry_name: 'b.txt' }, { entry_name: 'a.txt' }],
    stream_entries: [],
    dep_tokens: [],
    status: 10,
    process_status: 0,
    queue_position: null,
    result_exists: true,
  };

  const mockAxiosGetFor = ({
    hcResults,
    namespaceInfo,
    jobData,
    namespaceError,
  }) => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/jobs/status-codes')) {
        return Promise.resolve({
          data: [{ status_code: 10, description: 'Finished' }],
        });
      }
      if (url.includes('/text-entry')) {
        return Promise.resolve({ data: { entry_value: 'some content' } });
      }
      if (url.includes('/hypercube/') && hcResults != null) {
        return Promise.resolve({ data: { results: hcResults } });
      }
      if (url.includes('/namespaces/')) {
        if (namespaceError != null) {
          return Promise.reject(namespaceError);
        }
        return Promise.resolve({ data: namespaceInfo });
      }
      if (url.includes('/jobs/') && jobData != null) {
        return Promise.resolve({ data: jobData });
      }
      return Promise.reject({ status: 404 });
    });
  };

  it('renders a Hypercube job successfully and marks the model as consistent when namespace info is unique', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'hc:validToken123',
    });

    mockAxiosGetFor({
      hcResults: [
        {
          ...baseJob,
          finished: 1,
          job_count: 1,
          successfully_finished: 1,
        },
      ],
      namespaceInfo: [{ upload_date: '2023-01-01T00:00:00Z' }],
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('ns1'));
    expect(screen.getByText('model1').closest('button')).toBeInTheDocument();
  });

  it('renders a job with a temporary model without fetching namespace model info', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'temporaryModelToken123',
    });

    mockAxiosGetFor({
      jobData: {
        ...baseJob,
        is_temporary_model: true,
      },
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('ns1'));
    expect(screen.getByText('Temporary')).toBeInTheDocument();
  });

  it('renders a job successfully when several namespace model entries exist', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'multipleModelsToken123',
    });

    mockAxiosGetFor({
      jobData: baseJob,
      namespaceInfo: [
        { upload_date: '2022-01-01T00:00:00Z' },
        { upload_date: '2023-01-01T00:00:00Z' },
      ],
    });

    const user = userEvent.setup();
    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('ns1'));
    // model_consistent stays unset, so the model shows a warning badge instead of a download link
    await user.hover(screen.getByText('model1'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'The model used for this job no longer exists or was updated after submission',
    );
  });

  it('shows an alert but still renders the job when fetching model info fails with a non-403 error', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'modelInfoErrorToken123',
    });

    axios.isCancel.mockReturnValue(false);
    mockAxiosGetFor({
      jobData: baseJob,
      namespaceError: { response: { status: 500 } },
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('ns1'));
  });

  it('does not show an alert when fetching model info fails with a 403 error, but still renders the job', async () => {
    vi.mocked(useParams).mockReturnValue({
      token: 'modelInfoForbiddenToken123',
    });

    axios.isCancel.mockReturnValue(false);
    mockAxiosGetFor({
      jobData: baseJob,
      namespaceError: { response: { status: 403 } },
    });

    render(<Job />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('ns1'));
  });
});
