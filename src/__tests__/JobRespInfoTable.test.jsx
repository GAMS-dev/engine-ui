import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import JobRespInfoTable from '../components/JobRespInfoTable';
import axios from 'axios';

vi.mock('axios');
vi.mock('react-chartjs-2', () => ({
  Line: (props) => (
    <div data-testid="line-chart">{JSON.stringify(props.data)}</div>
  ),
}));

const baseJob = (overrides = {}) => ({
  status: 0,
  queue_position: null,
  token: 'token123',
  user: { username: 'user1', deleted: true },
  text_entries: [],
  stream_entries: [],
  stdout_filename: 'stdout.txt',
  process_status: null,
  result_exists: false,
  ...overrides,
});

describe('JobRespInfoTable', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
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
                  process_status: 0,
                  namespace: 'string',
                  model: 'string',
                  submitted: '2021-08-04T17:10:15.000000+00:00',
                  finished: '2021-08-04T17:10:15.000000+00:00',
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

  it('renders JobRespInfoTable correctly', async () => {
    const jobInfo = {
      status: '10',
      access_groups: null,
      tag: null,
      token: 'token123',
      user: { username: 'user1', delete: true },
      arguments: [],
      text_entries: [],
      stream_entries: [],
    };
    render(<JobRespInfoTable job={jobInfo} statusCodes={[]} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Result'));
  });

  it("computes solve trace entries from a finished job's text entries and allows switching between them", async () => {
    // SolveTraceEntryView fetches the trace via axios.get when the job is
    // finished; resolve it harmlessly so the chart (mocked above) can mount
    // without an unhandled rejection from the unrelated component.
    axios.get.mockResolvedValue({ data: { entry_value: null } });
    const job = baseJob({
      status: 10,
      result_exists: true,
      text_entries: [
        { entry_name: 'run.solvetrace' },
        { entry_name: 'other.solvetrace' },
        { entry_name: 'notes.txt' },
      ],
    });
    render(
      <JobRespInfoTable
        job={job}
        statusCodes={{}}
        server="testserver"
        isHcJob={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const label = await screen.findByText('Solve Trace');
    const row = label.closest('tr');
    const select = within(row).getByRole('combobox');
    const options = within(row).getAllByRole('option');
    expect(options.map((o) => o.value)).toEqual([
      'run.solvetrace',
      'other.solvetrace',
    ]);
    expect(select).toHaveValue('run.solvetrace');
    await user.selectOptions(select, 'other.solvetrace');
    expect(select).toHaveValue('other.solvetrace');
  });

  it("computes solve trace entries from an active job's stream entries and allows switching stream entries", async () => {
    const job = baseJob({
      status: 1,
      stream_entries: ['run.solvetrace', 'out.log'],
      stdout_filename: 'std.txt',
    });
    render(
      <JobRespInfoTable
        job={job}
        statusCodes={{}}
        server="testserver"
        isHcJob={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const solveTraceLabel = await screen.findByText('Solve Trace');
    const solveTraceRow = solveTraceLabel.closest('tr');
    const solveTraceOptions = within(solveTraceRow).getAllByRole('option');
    expect(solveTraceOptions.map((o) => o.value)).toEqual(['run.solvetrace']);

    const streamLabel = screen.getByText('Stream Entries');
    const streamRow = streamLabel.closest('tr');
    const streamSelect = within(streamRow).getByRole('combobox');
    expect(
      within(streamRow)
        .getAllByRole('option')
        .map((o) => o.value),
    ).toEqual(['run.solvetrace', 'out.log', 'std.txt']);
    expect(streamSelect).toHaveValue('run.solvetrace');
    await user.selectOptions(streamSelect, 'std.txt');
    expect(streamSelect).toHaveValue('std.txt');
  });

  it('renders and updates the text entry selector for finished jobs', async () => {
    const job = baseJob({
      status: 10,
      text_entries: [{ entry_name: 'a.txt' }, { entry_name: 'b.txt' }],
    });
    render(
      <JobRespInfoTable
        job={job}
        statusCodes={{}}
        server="testserver"
        isHcJob={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const label = await screen.findByText('Text Entries');
    const row = label.closest('tr');
    const select = within(row).getByRole('combobox');
    expect(select).toHaveValue('a.txt');
    await user.selectOptions(select, 'b.txt');
    expect(select).toHaveValue('b.txt');
  });

  it('opens the delete confirmation dialog and closes it via the Cancel button and via the close icon', async () => {
    const job = baseJob({ status: 15, result_exists: true });
    render(
      <JobRespInfoTable
        job={job}
        statusCodes={{}}
        server="testserver"
        isHcJob={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const deleteResultsButton = await screen.findByRole('button', {
      name: 'Delete Results',
    });
    await user.click(deleteResultsButton);
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );

    await user.click(deleteResultsButton);
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('deletes job results successfully and refreshes the job', async () => {
    axios.delete.mockResolvedValue({ status: 200 });
    const setRefreshJob = vi.fn();
    const job = baseJob({ status: 10, result_exists: true, token: 't1' });
    render(
      <JobRespInfoTable
        job={job}
        statusCodes={{}}
        server="testserver"
        isHcJob={false}
        setRefreshJob={setRefreshJob}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await user.click(
      await screen.findByRole('button', { name: 'Delete Results' }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('testserver/jobs/t1/result'),
    );
    await waitFor(() => expect(setRefreshJob).toHaveBeenCalled());
    const updaterFn = setRefreshJob.mock.calls[0][0];
    expect(updaterFn(3)).toBe(4);
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('shows an alert if deleting job results fails', async () => {
    axios.delete.mockRejectedValue(new Error('boom'));
    const setAlertMsg = vi.fn();
    const job = baseJob({ status: 10, result_exists: true, token: 't1' });
    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <JobRespInfoTable
          job={job}
          statusCodes={{}}
          server="testserver"
          isHcJob={false}
          setRefreshJob={vi.fn()}
        />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );
    await user.click(
      await screen.findByRole('button', { name: 'Delete Results' }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems deleting dataset. Error message: boom',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('does not compute solve trace entries for hypercube jobs even when finished', async () => {
    const job = baseJob({
      status: 10,
      finished: 5,
      job_count: 5,
      successfully_finished: 5,
      result_exists: true,
      text_entries: [{ entry_name: 'run.solvetrace' }],
    });
    render(
      <JobRespInfoTable
        job={job}
        statusCodes={{}}
        server="testserver"
        isHcJob={true}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await screen.findByText('Progress');
    expect(screen.getByText('5/5 (5 successful)')).toBeInTheDocument();
    expect(screen.queryByText('Solve Trace')).not.toBeInTheDocument();
    expect(screen.queryByText('Process Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Text Entries')).not.toBeInTheDocument();
  });
});
