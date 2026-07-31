import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Outlet, Route, Routes } from 'react-router';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UsageTimeline from '../components/UsageTimelines';

const getUsageTimelineComponent = ({ data, startDate, endDate }) => {
  return (
    <Routes>
      <Route
        path="/"
        element={<Outlet context={{ data, startDate, endDate }} />}
      >
        <Route index element={<UsageTimeline />} />
      </Route>
    </Routes>
  );
};

const renderTimeline = (props) =>
  render(getUsageTimelineComponent(props), {
    wrapper: AllProvidersWrapperDefault,
  });

describe('UsageTimelines', () => {
  it('shows an empty table when there is no usage data', async () => {
    renderTimeline({
      data: { job_usage: [], hypercube_job_usage: [] },
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(await screen.findByText('No Usage data found')).toBeInTheDocument();
  });

  it('does not compute chart data when job_usage/hypercube_job_usage are missing', async () => {
    renderTimeline({
      data: {},
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(await screen.findByText('No Usage data found')).toBeInTheDocument();
  });

  it('aggregates mixed job and hypercube usage across users and displays totals', async () => {
    const data = {
      job_usage: [
        // alice: finished job with a normal completed interval, weighted with multiplier
        {
          username: 'alice',
          token: 'j1',
          submitted: '2024-01-01T00:00:00.000Z',
          finished: '2024-01-01T00:10:00.000Z',
          times: [
            {
              start: '2024-01-01T00:00:00.000Z',
              finish: '2024-01-01T00:05:00.000Z',
            },
          ],
          labels: { multiplier: 2 },
        },
        // alice again -> exercises the "user already exists" merge branch
        {
          username: 'alice',
          token: 'j2',
          submitted: '2024-01-01T01:00:00.000Z',
          finished: '2024-01-01T01:10:00.000Z',
          times: [
            {
              start: '2024-01-01T01:00:00.000Z',
              finish: '2024-01-01T01:05:00.000Z',
            },
          ],
          labels: {},
        },
        // bob: finished job with no times recorded (solveTime 0 branch)
        {
          username: 'bob',
          token: 'j3',
          submitted: '2024-01-01T02:00:00.000Z',
          finished: '2024-01-01T02:05:00.000Z',
          times: [],
          labels: {},
        },
        // carol: still queued/canceling, not finished, no times
        {
          username: 'carol',
          token: 'j4',
          submitted: '2024-01-01T03:00:00.000Z',
          finished: null,
          times: [],
          labels: {},
        },
        // dave: currently running job
        {
          username: 'dave',
          token: 'j5',
          submitted: '2024-01-01T04:00:00.000Z',
          finished: null,
          times: [{ start: '2024-01-01T04:05:00.000Z', finish: null }],
          labels: {},
        },
        // erin: finished, but last interval never got a finish timestamp
        {
          username: 'erin',
          token: 'j6',
          submitted: '2024-01-01T05:00:00.000Z',
          finished: '2024-01-01T05:10:00.000Z',
          times: [{ start: '2024-01-01T05:05:00.000Z', finish: null }],
          labels: {},
        },
      ],
      hypercube_job_usage: [
        // frank: finished hypercube job
        {
          username: 'frank',
          token: 'hc1',
          job_count: 1,
          completed: 1,
          submitted: '2024-01-01T06:00:00.000Z',
          finished: '2024-01-01T06:10:00.000Z',
          jobs: [
            {
              times: [
                {
                  start: '2024-01-01T06:00:00.000Z',
                  finish: '2024-01-01T06:05:00.000Z',
                },
              ],
            },
          ],
          labels: {},
        },
        // frank again -> exercises hypercube "user already exists" merge branch
        {
          username: 'frank',
          token: 'hc2',
          job_count: 1,
          completed: 1,
          submitted: '2024-01-01T07:00:00.000Z',
          finished: '2024-01-01T07:10:00.000Z',
          jobs: [
            {
              times: [
                {
                  start: '2024-01-01T07:00:00.000Z',
                  finish: '2024-01-01T07:05:00.000Z',
                },
              ],
            },
          ],
          labels: {},
        },
        // grace: hypercube job still running
        {
          username: 'grace',
          token: 'hc3',
          job_count: 2,
          completed: 0,
          submitted: '2024-01-01T08:00:00.000Z',
          finished: null,
          jobs: [
            {
              times: [{ start: '2024-01-01T08:05:00.000Z', finish: null }],
            },
          ],
          labels: {},
        },
        // henry: hypercube job with no sub-jobs yet (queuetime 0 branch)
        {
          username: 'henry',
          token: 'hc4',
          job_count: 0,
          completed: 0,
          submitted: '2024-01-01T09:00:00.000Z',
          finished: '2024-01-01T09:05:00.000Z',
          jobs: [],
          labels: {},
        },
        // irene: hypercube finished, sub-job never started (NaN queuetime branch)
        {
          username: 'irene',
          token: 'hc5',
          job_count: 1,
          completed: 1,
          submitted: '2024-01-01T10:00:00.000Z',
          finished: '2024-01-01T10:05:00.000Z',
          jobs: [{ times: [] }],
          labels: {},
        },
        // jane: hypercube still running, sub-job never started
        {
          username: 'jane',
          token: 'hc6',
          job_count: 2,
          completed: 0,
          submitted: '2024-01-01T11:00:00.000Z',
          finished: null,
          jobs: [{ times: [] }],
          labels: {},
        },
      ],
    };

    renderTimeline({
      data,
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      endDate: new Date('2024-01-02T00:00:00.000Z'),
    });

    // Aggregated table + totals are shown once there is more than one user
    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('Total Time:')).toBeInTheDocument();
    expect(screen.getByText('Total Solve Time:')).toBeInTheDocument();
    expect(screen.getByText('frank')).toBeInTheDocument();
    expect(screen.getByText('jane')).toBeInTheDocument();

    const user = userEvent.setup();

    // Switch to disaggregated view
    const disaggregateCheckbox = screen.getByRole('checkbox', {
      name: /Show disaggregated data\?/i,
    });
    await user.click(disaggregateCheckbox);

    // Disaggregated table shows individual job tokens, including the
    // hypercube "HC" badge rendered by JobTokenLink for hypercube rows.
    expect(await screen.findByText('hc1')).toBeInTheDocument();
    expect(screen.getAllByText('HC').length).toBeGreaterThan(0);
    expect(screen.getByText('j1')).toBeInTheDocument();
  });
});
