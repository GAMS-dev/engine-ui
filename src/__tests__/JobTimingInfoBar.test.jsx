import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import JobTimingInfoBar from '../components/JobTimingInfoBar';
import axios from 'axios';

vi.mock('axios');

describe('JobTimingInfoBar', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/':
          return Promise.resolve({
            status: 200,
            data: {
              job_usage: [
                {
                  username: 'user1',
                  token: 'token1234',
                  status: 1,
                  process_status: 0,
                  namespace: 'string',
                  model: 'string',
                  submitted: '2021-08-04T17:10:15.000000+00:00',
                  finished: '2021-08-06T17:10:15.000000+00:00',
                  times: [
                    {
                      start: '2021-08-04T17:10:15.000000+00:00',
                      finish: '2021-08-05T17:10:15.000000+00:00',
                    },
                  ],
                  labels: {
                    cpu_request: 0,
                    memory_request: 0,
                    workspace_request: 0,
                    tolerations: [
                      {
                        key: 'string',
                        value: 'string',
                      },
                    ],
                    node_selectors: [
                      {
                        key: 'string',
                        value: 'string',
                      },
                    ],
                    resource_warning: 'none',
                    instance: 'instance_1',
                    multiplier: 3,
                    additionalProp1: 'string',
                    additionalProp2: 'string',
                    additionalProp3: 'string',
                  },
                },
              ],
              hypercube_job_usage: [],
              pool_usage: [],
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders JobTimingInfoBar correctly', async () => {
    render(<JobTimingInfoBar token="token1234" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => {
      expect(
        screen.getByText('86400s', { selector: '.job-timings-info-running' }),
      ).toBeInTheDocument();
    });
  });

  it('shows an error badge when the job progress request fails', async () => {
    axios.get.mockImplementation(() => Promise.reject(new Error('boom')));

    render(<JobTimingInfoBar token="token1234" />, {
      wrapper: AllProvidersWrapperDefault,
    });

    expect(
      await screen.findByText('Problems fetching timing data.'),
    ).toBeInTheDocument();
  });

  it('shows an error badge when the submitted timestamp is missing', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/':
          return Promise.resolve({
            status: 200,
            data: {
              job_usage: [
                {
                  username: 'user1',
                  token: 'token1234',
                  status: 1,
                  times: [],
                },
              ],
              hypercube_job_usage: [],
              pool_usage: [],
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<JobTimingInfoBar token="token1234" />, {
      wrapper: AllProvidersWrapperDefault,
    });

    expect(
      await screen.findByText('Problems fetching timing data.'),
    ).toBeInTheDocument();
  });

  it('refreshes the queue position for a queued job outside of kubernetes', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/':
          return Promise.resolve({
            status: 200,
            data: {
              job_usage: [
                {
                  username: 'user1',
                  token: 'token1234',
                  status: 0,
                  submitted: '2021-08-04T17:10:15.000000+00:00',
                  finished: null,
                  times: [],
                },
              ],
              hypercube_job_usage: [],
              pool_usage: [],
            },
          });
        case 'testserver/jobs/token1234':
          return Promise.resolve({
            status: 200,
            data: { queue_position: 3 },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    const setQueuePosition = vi.fn();
    const setJobStatus = vi.fn();

    render(
      <JobTimingInfoBar
        token="token1234"
        setQueuePosition={setQueuePosition}
        setJobStatus={setJobStatus}
      />,
      {
        wrapper: ({ children }) => (
          <AllProvidersWrapperDefault options={{ in_kubernetes: false }}>
            {children}
          </AllProvidersWrapperDefault>
        ),
      },
    );

    await waitFor(() => {
      expect(setQueuePosition).toHaveBeenCalledWith(3);
    });
    expect(setJobStatus).toHaveBeenCalledWith(0);
  });

  it('renders a running interval for a job that has not finished yet', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/':
          return Promise.resolve({
            status: 200,
            data: {
              job_usage: [
                {
                  username: 'user1',
                  token: 'token1234',
                  status: 1,
                  submitted: '2021-08-04T17:10:15.000000+00:00',
                  finished: null,
                  times: [
                    {
                      start: '2021-08-04T17:10:15.000000+00:00',
                      finish: null,
                    },
                  ],
                },
              ],
              hypercube_job_usage: [],
              pool_usage: [],
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    const setJobStatus = vi.fn();

    render(<JobTimingInfoBar token="token1234" setJobStatus={setJobStatus} />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => {
      expect(setJobStatus).toHaveBeenCalledWith(1);
    });
    expect(
      document.querySelector('.job-timings-info-running'),
    ).toBeInTheDocument();
  });

  it('renders hypercube job timings including a restarted interval', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/':
          return Promise.resolve({
            status: 200,
            data: {
              job_usage: [],
              hypercube_job_usage: [
                {
                  username: 'user1',
                  token: 'hctoken1',
                  status: 10,
                  submitted: '2021-08-04T17:10:15.000000+00:00',
                  finished: '2021-08-06T17:10:15.000000+00:00',
                  jobs: [
                    {
                      times: [
                        {
                          start: '2021-08-04T17:10:15.000000+00:00',
                          finish: null,
                        },
                        {
                          start: '2021-08-04T18:10:15.000000+00:00',
                          finish: '2021-08-05T17:10:15.000000+00:00',
                        },
                      ],
                    },
                    {
                      times: [],
                    },
                  ],
                },
              ],
              pool_usage: [],
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    const setJobStatus = vi.fn();

    render(
      <JobTimingInfoBar
        token="hctoken1"
        isHcJob={true}
        setJobStatus={setJobStatus}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    await waitFor(() => {
      expect(document.querySelectorAll('.job-timings-info-bar').length).toBe(2);
    });
    expect(setJobStatus).toHaveBeenCalledWith(10);
  });
});
