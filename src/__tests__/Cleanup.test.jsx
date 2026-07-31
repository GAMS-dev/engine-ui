import {
  render,
  waitFor,
  screen,
  fireEvent,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Cleanup from '../components/Cleanup';
import axios from 'axios';
import AlertContext from '../contexts/AlertContext';

vi.mock('axios');

const dataset1 = {
  token: 'tok1',
  type: 'result',
  user: { username: 'user1', deleted: false },
  namespace: 'ns1',
  length: 500000,
  upload_date: '2021-08-04T17:10:15.000000+00:00',
};

const dataset2 = {
  token: 'tok2',
  type: 'hypercube_result',
  user: { username: 'deleteduser', deleted: true, old_username: 'olduser' },
  namespace: 'ns2',
  length: 999,
  upload_date: '2021-08-05T17:10:15.000000+00:00',
};

describe('Cleanup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/cleanup/results':
          return Promise.resolve({
            status: 200,
            data: {
              count: 0,
              next: null,
              previous: null,
              results: [],
              total_length: 0,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    // the volume quota is fetched via calling axios(...) directly, not axios.get
    axios.mockImplementation((config) => {
      if (config?.url === 'testserver/usage/quota') {
        return Promise.resolve({ status: 200, data: [] });
      }
      return Promise.reject(new Error('not found'));
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

  it('renders Cleanup correctly', async () => {
    render(<Cleanup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Total File Size/));
  });

  it('shows the remaining file size quota when a quota is set', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/cleanup/results':
          return Promise.resolve({
            status: 200,
            data: {
              count: 0,
              results: [],
              total_length: 500000,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    axios.mockImplementation((config) => {
      if (config?.url === 'testserver/usage/quota') {
        return Promise.resolve({
          status: 200,
          data: [{ disk_quota: 1000000, disk_used: 200000 }],
        });
      }
      return Promise.reject(new Error('not found'));
    });
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText(/500\.00KB/));
    await waitFor(() => screen.findByText(/\/800\.00KB/));
  });

  it('shows no quota limit when there is no quota data', async () => {
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText(/Total File Size/));
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it('renders dataset rows and blanks the username for deleted users', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/cleanup/results':
          return Promise.resolve({
            status: 200,
            data: {
              count: 2,
              results: [dataset1, dataset2],
              total_length: 500999,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('tok1'));
    expect(screen.getByText('tok2')).toBeInTheDocument();
    expect(screen.getByText('HC')).toBeInTheDocument();
    expect(screen.getByText('Deleted')).toBeInTheDocument();
  });

  it('shows an alert and an empty table if fetching the cleanup data fails', async () => {
    axios.get.mockImplementation(() =>
      Promise.reject(new Error('cleanup fetch failed')),
    );
    const setAlertMsg = vi.fn();
    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <Cleanup />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems fetching cleanup information. Error message: cleanup fetch failed',
      ),
    );
    await waitFor(() => screen.findByText('No Datasets found'));
  });

  it('shows an error when the housekeeping threshold is not a valid integer', async () => {
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await user.click(screen.getByText(/Run Housekeeping/));
    const input = screen.getByLabelText('Delete all data older than ... days');
    await user.clear(input);
    fireEvent.submit(input.closest('form'));
    await waitFor(() =>
      screen.findByText(
        'The number of days you entered is not a valid integer!',
      ),
    );
  });

  it('deletes old data via housekeeping and refreshes the list', async () => {
    axios.get.mockImplementation((url, config) => {
      if (url === 'testserver/cleanup/results') {
        if (config?.params?.to_datetime) {
          return Promise.resolve({
            status: 200,
            data: {
              results: [
                { token: 'oldtok1', type: 'result', user: { deleted: false } },
                {
                  token: 'oldtok2',
                  type: 'hypercube_result',
                  user: { deleted: false },
                },
              ],
            },
          });
        }
        return Promise.resolve({
          status: 200,
          data: { count: 0, results: [], total_length: 0 },
        });
      }
      return Promise.reject(new Error('not found'));
    });
    axios.delete.mockResolvedValue({ status: 200 });
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await user.click(screen.getByText(/Run Housekeeping/));
    const input = await screen.findByLabelText(
      'Delete all data older than ... days',
    );
    await user.clear(input);
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/cleanup/results',
        expect.objectContaining({
          data: 'token=oldtok1&hypercube_token=oldtok2',
        }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Delete all data older than ... days'),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows "Nothing to remove" when housekeeping finds no matching data', async () => {
    axios.get.mockImplementation((url, config) => {
      if (url === 'testserver/cleanup/results') {
        if (config?.params?.to_datetime) {
          return Promise.resolve({ status: 200, data: { results: [] } });
        }
        return Promise.resolve({
          status: 200,
          data: { count: 0, results: [], total_length: 0 },
        });
      }
      return Promise.reject(new Error('not found'));
    });
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await user.click(screen.getByText(/Run Housekeeping/));
    const input = await screen.findByLabelText(
      'Delete all data older than ... days',
    );
    await user.clear(input);
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => screen.findByText('Nothing to remove'));
  });

  it('shows an error if fetching the housekeeping tokens fails', async () => {
    axios.get.mockImplementation((url, config) => {
      if (url === 'testserver/cleanup/results') {
        if (config?.params?.to_datetime) {
          return Promise.reject(new Error('threshold fetch failed'));
        }
        return Promise.resolve({
          status: 200,
          data: { count: 0, results: [], total_length: 0 },
        });
      }
      return Promise.reject(new Error('not found'));
    });
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await user.click(screen.getByText(/Run Housekeeping/));
    const input = await screen.findByLabelText(
      'Delete all data older than ... days',
    );
    await user.clear(input);
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      screen.findByText(
        'Problems deleting dataset. Error message: threshold fetch failed',
      ),
    );
  });

  it('deletes a single job via the confirm dialog and refreshes the list', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/cleanup/results':
          return Promise.resolve({
            status: 200,
            data: { count: 1, results: [dataset1], total_length: 500000 },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    axios.delete.mockResolvedValue({ status: 200 });
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('tok1'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => screen.findByText(/Please Confirm/));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('tok1')).toBeInTheDocument();
    expect(dialog.getByText('user1')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/cleanup/results',
        expect.objectContaining({ data: 'token=tok1' }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText(/Please Confirm/)).not.toBeInTheDocument(),
    );
  });

  it('shows an error message if deleting a single job fails', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/cleanup/results':
          return Promise.resolve({
            status: 200,
            data: { count: 1, results: [dataset1], total_length: 500000 },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
    axios.delete.mockRejectedValue(new Error('delete failed'));
    render(<Cleanup />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('tok1'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => screen.findByText(/Please Confirm/));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      screen.findByText(
        'Problems deleting dataset. Error message: delete failed',
      ),
    );
  });
});
