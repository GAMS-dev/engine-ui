import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils.jsx';

import SolveTraceEntryView from '../components/SolveTraceEntryView';
import axios from 'axios';
import { useParams } from 'react-router';

vi.mock('axios');
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});
vi.mock('react-chartjs-2', () => ({
  Line: (props) => (
    <div data-testid="line-chart">{JSON.stringify(props.data)}</div>
  ),
}));

describe('SolveTraceEntryView', () => {
  const mockServer = 'testserver';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ token: 'token1234' });
  });

  it('fetches the solvetrace entry via delete when the job is still running', async () => {
    axios.delete.mockResolvedValue({
      data: { entry_value: 'a,b,c,1,10.5,20.5\na,b,c,2,11.5,21.5' },
    });

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={vi.fn()}
        jobFinished={false}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/jobs/token1234/stream-entry/trace1',
      );
    });

    await waitFor(() => {
      const chart = JSON.parse(screen.getByTestId('line-chart').textContent);
      expect(chart.labels).toEqual([1, 2]);
      expect(chart.datasets[0].data).toEqual([10.5, 11.5]);
      expect(chart.datasets[1].data).toEqual([20.5, 21.5]);
    });
  });

  it('fetches the solvetrace entry via get when the job is finished', async () => {
    axios.get.mockResolvedValue({
      data: { entry_value: 'a,b,c,1,10.5,20.5' },
    });

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={vi.fn()}
        jobFinished={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'testserver/jobs/token1234/text-entry/trace1',
      );
    });
    expect(axios.delete).not.toHaveBeenCalled();

    await waitFor(() => {
      const chart = JSON.parse(screen.getByTestId('line-chart').textContent);
      expect(chart.labels).toEqual([1]);
    });
  });

  it('ignores comment lines starting with "* "', async () => {
    axios.get.mockResolvedValue({
      data: {
        entry_value: '* a comment line\na,b,c,1,10.5,20.5',
      },
    });

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={vi.fn()}
        jobFinished={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await waitFor(() => {
      const chart = JSON.parse(screen.getByTestId('line-chart').textContent);
      expect(chart.labels).toEqual([1]);
    });
  });

  it('renders an empty chart and does not crash when entry_value is null', async () => {
    axios.get.mockResolvedValue({ data: { entry_value: null } });

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={vi.fn()}
        jobFinished={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    const chart = JSON.parse(screen.getByTestId('line-chart').textContent);
    expect(chart.labels).toEqual([]);
  });

  it('shows a parsing error message when the response is malformed', async () => {
    axios.get.mockResolvedValue({});

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={vi.fn()}
        jobFinished={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    expect(
      await screen.findByText(/Problems parsing solvetrace file/i),
    ).toBeInTheDocument();
  });

  it('shows an error message when the request fails with a non-308 error', async () => {
    axios.get.mockRejectedValue({
      response: { status: 500 },
      message: 'Server error',
    });

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={vi.fn()}
        jobFinished={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    expect(
      await screen.findByText(
        /A problem occurred while retrieving the stream entry/i,
      ),
    ).toBeInTheDocument();
  });

  it('triggers a job refresh instead of an error when the request fails with a 308', async () => {
    const setRefreshJob = vi.fn();
    axios.get.mockRejectedValue({ response: { status: 308 } });

    render(
      <SolveTraceEntryView
        server={mockServer}
        solveTraceEntry="trace1"
        setRefreshJob={setRefreshJob}
        jobFinished={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await waitFor(() => {
      expect(setRefreshJob).toHaveBeenCalled();
    });

    const updaterFn = setRefreshJob.mock.calls[0][0];
    expect(updaterFn(0)).toBe(1);
  });
});
