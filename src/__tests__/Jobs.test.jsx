import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Jobs from '../components/Jobs';
import axios from 'axios';

vi.mock('axios');

describe('Jobs', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/jobs/status-codes':
          return Promise.resolve({
            status: 200,
            data: [
              {
                status_code: -10,
                description: 'Waiting',
              },
              {
                status_code: -3,
                description: 'Cancelled',
              },
              {
                status_code: -2,
                description: 'Cancelling',
              },
              {
                status_code: -1,
                description: 'Corrupted',
              },
              {
                status_code: 0,
                description: 'Queued',
              },
              {
                status_code: 1,
                description: 'Running',
              },
              {
                status_code: 2,
                description: 'Outputting',
              },
              {
                status_code: 10,
                description: 'Finished',
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders Jobs correctly', async () => {
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('New Job'));
  });

  it('changes tag expanded when clicked', async () => {
    const user = userEvent.setup();
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });

    const maximizeButtons = await screen.findAllByRole('button', {
      name: /expand tag column/i,
    });
    await user.click(maximizeButtons[0]);

    const minimizeButton = (
      await screen.findAllByRole('button', {
        name: /minimize tag column/i,
        hidden: false,
      })
    )[0];

    expect(minimizeButton).toBeInTheDocument();
    user.click(minimizeButton);

    const maximizeButtonsNew = await screen.findAllByRole('button', {
      name: /expand tag column/i,
    });
    expect(maximizeButtonsNew[0]).toBeInTheDocument();
  });

  it('renders job rows with status, tag, and action columns when data is loaded', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/jobs/status-codes':
          return Promise.resolve({
            status: 200,
            data: [{ status_code: 1, description: 'Running' }],
          });
        case 'testserver/jobs/':
          return Promise.resolve({
            status: 200,
            data: {
              count: 1,
              results: [
                {
                  user: { username: 'user1' },
                  model: 'modelA',
                  namespace: 'ns1',
                  tag: 'sometag',
                  submitted_at: '2021-08-04T17:10:15.000000+00:00',
                  status: 1,
                  token: 'tok1',
                },
              ],
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    const user = userEvent.setup();
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('modelA'));
    expect(await screen.findByText('Running')).toBeInTheDocument();
    expect(screen.getByText('sometag')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show' })).toBeInTheDocument();

    // Expand the tag column while data is present to exercise the expanded displayer
    const maximizeButtons = await screen.findAllByRole('button', {
      name: /expand tag column/i,
    });
    await user.click(maximizeButtons[0]);
    expect(screen.getByText('sometag')).toBeInTheDocument();
  });

  it('fetches Hypercube jobs when the Hypercube Jobs tab is selected', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/jobs/status-codes':
          return Promise.resolve({
            status: 200,
            data: [{ status_code: 10, description: 'Finished' }],
          });
        case 'testserver/jobs/':
          return Promise.resolve({
            status: 200,
            data: { count: 0, results: [] },
          });
        case 'testserver/hypercube/':
          return Promise.resolve({
            status: 200,
            data: {
              count: 1,
              results: [
                {
                  user: { username: 'user2' },
                  model: 'modelB',
                  namespace: 'ns2',
                  tag: 'hctag',
                  submitted_at: '2021-08-04T17:10:15.000000+00:00',
                  status: 10,
                  token: 'hctok1',
                },
              ],
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    const user = userEvent.setup();
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('New Job'));

    const hcTab = await screen.findByRole('tab', { name: 'Hypercube Jobs' });
    await user.click(hcTab);

    await waitFor(() => screen.findByText('modelB'));
    expect(await screen.findByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('hctag')).toBeInTheDocument();
  });

  it('toggles the active filter and refreshes the job list', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/jobs/status-codes':
          return Promise.resolve({
            status: 200,
            data: [{ status_code: 1, description: 'Running' }],
          });
        case 'testserver/jobs/':
          return Promise.resolve({
            status: 200,
            data: { count: 0, results: [] },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    const user = userEvent.setup();
    render(<Jobs />, {
      wrapper: AllProvidersWrapperDefault,
    });

    const filterButton = await screen.findByRole('button', {
      name: /Show Active/i,
    });
    await user.click(filterButton);
    expect(
      await screen.findByRole('button', { name: /Show All/i }),
    ).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    await user.click(refreshButton);
    expect(refreshButton).toBeInTheDocument();
  });
});
