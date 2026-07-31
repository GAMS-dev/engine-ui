import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import TerminateJobButton from '../components/TerminateJobButton';

vi.mock('axios');

describe('TerminateJobButton', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });
  it('renders TerminateJobButton correctly', async () => {
    render(<TerminateJobButton status={1} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByText(/Cancel/));
    await waitFor(() => screen.findByText('Please Confirm'));
  });

  it('does not render the action button for an inactive job', () => {
    render(<TerminateJobButton status={10} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(
      screen.queryByRole('button', { name: /Cancel/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Hard Kill/ }),
    ).not.toBeInTheDocument();
  });

  it('shows a Hard Kill label and button for status -2/cancelling', async () => {
    render(<TerminateJobButton status={-2} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(
      screen.getByRole('button', { name: /Hard Kill/ }),
    ).toBeInTheDocument();
  });

  it('renders the button for status -10/waiting (also considered active)', () => {
    render(<TerminateJobButton status={-10} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('clicking No closes the confirm dialog without calling axios', async () => {
    render(
      <TerminateJobButton status={1} token="job123" setRefresh={vi.fn()} />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    await waitFor(() => screen.getByText('Please Confirm'));
    await user.click(screen.getByRole('button', { name: 'No' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('terminates a regular job with the correct URL and refreshes', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <TerminateJobButton
        status={1}
        token="job123"
        server="testserver"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel job' }));

    expect(setRefresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/jobs/job123?hard_kill=false',
        {},
      ),
    );
  });

  it('hard-kills a job using the hypercube URL when the token starts with hc:', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <TerminateJobButton
        status={-2}
        token="hc:hcjob123"
        server="testserver"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: /Hard Kill/ }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel job' }));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/hypercube/hcjob123?hard_kill=true',
        {},
      ),
    );
  });

  it('shows an alert message when terminating the job fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <TerminateJobButton
          status={1}
          token="job123"
          server="testserver"
          setRefresh={vi.fn()}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    await user.click(screen.getByRole('button', { name: 'Yes, cancel job' }));

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems terminating job. Error message: Test error',
      ),
    );
  });
});
