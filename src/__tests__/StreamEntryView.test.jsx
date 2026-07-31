import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils.jsx';

import StreamEntryView from '../components/StreamEntryView';
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

describe('StreamEntryView', () => {
  const mockServer = 'testserver';

  const openModal = async (user) => {
    await user.click(screen.getByRole('button', { name: '' }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ token: 'token1234' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders only the trigger button before the modal is opened', () => {
    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('fetches and displays the stream entry content when opened', async () => {
    const user = userEvent.setup();
    axios.delete.mockResolvedValue({
      data: { entry_value: 'Hello from stream' },
    });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);

    expect(await screen.findByText('entry1')).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/jobs/token1234/stream-entry',
        { params: { entry_name: 'entry1' } },
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('Hello from stream');
    });
  });

  it('uses the unread-logs endpoint and the message field when isStdOut is true', async () => {
    const user = userEvent.setup();
    axios.delete.mockResolvedValue({
      data: { message: 'stdout content' },
    });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="stdout"
        isStdOut={true}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/jobs/token1234/unread-logs',
        {},
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('stdout content');
    });
  });

  it('shows an error message when the request fails with a non-308 error', async () => {
    const user = userEvent.setup();
    axios.delete.mockRejectedValue({
      response: { status: 500 },
      message: 'Server error',
    });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);

    expect(
      await screen.findByText(
        /A problem occurred while retrieving the stream entry/i,
      ),
    ).toBeInTheDocument();
  });

  it('triggers a job refresh instead of an error when the request fails with a 308', async () => {
    const user = userEvent.setup();
    const setRefreshJob = vi.fn();
    axios.delete.mockRejectedValue({ response: { status: 308 } });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={setRefreshJob}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);

    await waitFor(() => {
      expect(setRefreshJob).toHaveBeenCalled();
    });

    // The refresh callback receives an updater function
    const updaterFn = setRefreshJob.mock.calls[0][0];
    expect(updaterFn(0)).toBe(1);
  });

  it('closes the modal when the Cancel button is clicked', async () => {
    const user = userEvent.setup();
    axios.delete.mockResolvedValue({ data: { entry_value: 'content' } });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);
    expect(await screen.findByText('entry1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('entry1')).not.toBeInTheDocument();
    });
  });

  it('toggles the auto-scroll checkbox', async () => {
    const user = userEvent.setup();
    axios.delete.mockResolvedValue({ data: { entry_value: 'content' } });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);
    await screen.findByText('entry1');

    const checkbox = await screen.findByRole('checkbox', { name: 'Update' });
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('accumulates successive polls, unaffected by an empty poll in between', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    axios.delete
      .mockResolvedValueOnce({ data: { entry_value: 'first ' } })
      .mockResolvedValueOnce({ data: { entry_value: '' } })
      .mockResolvedValue({ data: { entry_value: 'second' } });

    render(
      <StreamEntryView
        server={mockServer}
        streamEntry="entry1"
        isStdOut={false}
        setRefreshJob={vi.fn()}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

    await openModal(user);
    await screen.findByText('entry1');

    await waitFor(() =>
      expect(screen.getByRole('textbox')).toHaveValue('first '),
    );

    // Second poll returns no new data - content is unchanged.
    await vi.advanceTimersByTimeAsync(1500);
    await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('textbox')).toHaveValue('first ');

    // Third poll appends its new data onto the existing content.
    await vi.advanceTimersByTimeAsync(1500);
    await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(3));
    expect(screen.getByRole('textbox')).toHaveValue('first second');
  });
});
