import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useParams } from 'react-router';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import axios from 'axios';
import { Outlet, Route, Routes } from 'react-router';
import Usage from '../components/Usage';
import userEvent from '@testing-library/user-event';
import AlertContext from '../contexts/AlertContext';
import dayjs from 'dayjs';

vi.mock('axios');

// The real Mantine DateTimePicker renders a full calendar UI that is
// impractical to drive from jsdom. We stub it out and capture the props
// Usage.jsx passes to it so tests can invoke `onChange` / `onDropdownClose`
// directly, exercising the component's own date-handling logic.
let mockDateTimePickerProps = null;
vi.mock('@mantine/dates', () => ({
  DateTimePicker: (props) => {
    mockDateTimePickerProps = props;
    return <div data-testid="mock-date-time-picker">{props.label}</div>;
  },
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

const getUsageComponent = ({ userToEditRoles = [] }) => {
  return (
    <Routes>
      <Route path="/" element={<Outlet context={{ userToEditRoles }} />}>
        <Route index element={<Usage />} />
      </Route>
    </Routes>
  );
};

// Shared setup for tests that only exercise the date-range picker logic
// (handleDateChange / onDropdownClose). Uses the simpler v1 (non-brokerv2)
// data path since the network responses themselves aren't under test here.
const renderUsageForDateTests = () => {
  axios.mockImplementation((config) => {
    if (config?.url === 'testserver/usage/quota') {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(new Error('not found'));
  });
  axios.get.mockImplementation((url) => {
    if (url.includes('/usage/quota')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });

  return render(getUsageComponent({ userToEditRoles: ['admin'] }), {
    wrapper: ({ children }) => (
      <AllProvidersWrapperDefault options={{ use_brokerv2: false }}>
        {children}
      </AllProvidersWrapperDefault>
    ),
  });
};

describe('Usage', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();

    vi.clearAllMocks();
    mockDateTimePickerProps = null;
    axios.isCancel = vi.fn().mockReturnValue(false);
    vi.mocked(useParams).mockReturnValue({
      userToEdit: 'user1',
    });

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

  it('renders Usage correctly', async () => {
    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Show Invitees?'));
  });

  it('displays the remaining quota when quota data is returned', async () => {
    axios.mockImplementation((config) => {
      if (config?.url === 'testserver/usage/quota') {
        return Promise.resolve({
          data: [
            {
              volume_quota: 1000,
              volume_used: 200,
              disk_quota: 500,
              disk_used: 100,
            },
          ],
        });
      }
      return Promise.reject(new Error('not found'));
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: AllProvidersWrapperDefault,
    });

    expect(await screen.findByText(/\$8\.00/)).toBeInTheDocument();
  });

  it('shows unlimited quota when no quota data is returned', async () => {
    axios.mockImplementation((config) => {
      if (config?.url === 'testserver/usage/quota') {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('not found'));
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: AllProvidersWrapperDefault,
    });

    expect(await screen.findByText(/unlimited/)).toBeInTheDocument();
  });

  it('toggles Show Invitees and clicks Refresh Data / Timeline nav without crashing', async () => {
    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    const invitees = screen.getByRole('checkbox');
    await user.click(invitees);
    expect(invitees).not.toBeChecked();

    const refreshButton = await screen.findByRole('button', {
      name: /Refresh Data/i,
    });
    await user.click(refreshButton);

    const timelineLink = await screen.findByRole('tab', {
      name: /Timeline/i,
    });
    await user.click(timelineLink);
  });

  it('shows an error message on a non-cancel error while fetching remaining paginated data', async () => {
    axios.get.mockImplementation((url, options) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }

      const offset = options?.params?.offset || 0;
      const perPage = 100;
      let total = 0;

      if (url.includes('/usage/user1/jobs')) total = 150;
      else if (url.includes('/usage/user1/hypercube')) total = 50;
      else if (url.includes('/usage/user1/pools')) total = 50;

      if (url.includes('/usage/user1/jobs') && offset === 100) {
        return Promise.reject(new Error('network error'));
      }

      const remaining = Math.max(0, total - offset);
      const itemsCount = Math.min(perPage, remaining);
      const items = Array.from({ length: itemsCount }).map((_, i) => ({
        id: offset + i,
      }));

      return Promise.resolve({
        headers: {
          'x-total': total.toString(),
          'x-per-page': perPage.toString(),
        },
        data: { items },
      });
    });

    const setAlertMsg = vi.fn();
    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AlertContext.Provider value={['', setAlertMsg]}>
          <AllProvidersWrapperDefault options={{ use_brokerv2: true }}>
            {children}
          </AllProvidersWrapperDefault>
        </AlertContext.Provider>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        expect.stringContaining(
          'Problems fetching usage information: network error',
        ),
      ),
    );

    // Once the failed request is handled, loading should stop and the
    // Refresh Data button should reappear.
    await waitFor(() => screen.findByRole('button', { name: /Refresh Data/i }));
  });

  it('shows an error message when the initial usage fetch itself fails with a non-cancel error', async () => {
    axios.isCancel = vi.fn().mockReturnValue(false);
    axios.get.mockImplementation((url) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('initial fetch boom'));
    });

    const setAlertMsg = vi.fn();
    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AlertContext.Provider value={['', setAlertMsg]}>
          <AllProvidersWrapperDefault options={{ use_brokerv2: false }}>
            {children}
          </AllProvidersWrapperDefault>
        </AlertContext.Provider>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        expect.stringContaining(
          'Problems fetching usage information: initial fetch boom',
        ),
      ),
    );

    // The initial fetch's catch block always resets isLoading, regardless of
    // which branch (cancel vs. non-cancel) was taken.
    await waitFor(() => screen.findByRole('button', { name: /Refresh Data/i }));
  });

  it('shows a cancellation message when the initial usage fetch itself is canceled', async () => {
    axios.isCancel = vi.fn().mockReturnValue(true);
    axios.get.mockImplementation((url) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.reject(new Error('canceled'));
    });

    const setAlertMsg = vi.fn();
    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AlertContext.Provider value={['', setAlertMsg]}>
          <AllProvidersWrapperDefault options={{ use_brokerv2: false }}>
            {children}
          </AllProvidersWrapperDefault>
        </AlertContext.Provider>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith('Request canceled by the user.'),
    );

    await waitFor(() => screen.findByRole('button', { name: /Refresh Data/i }));
  });

  it('handles a canceled error while fetching remaining paginated data', async () => {
    axios.isCancel = vi.fn().mockReturnValue(true);

    axios.get.mockImplementation((url, options) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }

      const offset = options?.params?.offset || 0;
      const perPage = 100;
      let total = 0;

      if (url.includes('/usage/user1/jobs')) total = 150;
      else if (url.includes('/usage/user1/hypercube')) total = 50;
      else if (url.includes('/usage/user1/pools')) total = 50;

      if (url.includes('/usage/user1/jobs') && offset === 100) {
        return Promise.reject(new Error('canceled'));
      }

      const remaining = Math.max(0, total - offset);
      const itemsCount = Math.min(perPage, remaining);
      const items = Array.from({ length: itemsCount }).map((_, i) => ({
        id: offset + i,
      }));

      return Promise.resolve({
        headers: {
          'x-total': total.toString(),
          'x-per-page': perPage.toString(),
        },
        data: { items },
      });
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ use_brokerv2: true }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    await waitFor(() => screen.findByRole('button', { name: /Refresh Data/i }));
  });

  it('fetches from correct SaaS endpoints and makes the correct number of paginated requests', async () => {
    axios.get.mockImplementation((url, options) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }

      const offset = options?.params?.offset || 0;
      const perPage = 100;
      let total = 0;

      // Define how many total items exist for each endpoint
      if (url.includes('/usage/user1/jobs'))
        total = 250; // Should take 3 calls (0, 100, 200)
      else if (url.includes('/usage/user1/hypercube'))
        total = 50; // Should take 1 call (0)
      else if (url.includes('/usage/user1/pools')) total = 150; // Should take 2 calls (0, 100)

      const remaining = Math.max(0, total - offset);
      const itemsCount = Math.min(perPage, remaining);
      const items = Array.from({ length: itemsCount }).map((_, i) => ({
        id: offset + i,
      }));

      return Promise.resolve({
        headers: {
          'x-total': total.toString(),
          'x-per-page': perPage.toString(),
        },
        data: { items },
      });
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ use_brokerv2: true }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    const jobsUrl = `testserver/v2/usage/user1/jobs`;
    const hcUrl = `testserver/v2/usage/user1/hypercube`;
    const poolsUrl = `testserver/v2/usage/user1/pools`;

    // Check Phase 1 calls (Offset 0)
    expect(axios.get).toHaveBeenCalledWith(
      jobsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      }),
    );
    expect(axios.get).toHaveBeenCalledWith(
      hcUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      }),
    );
    expect(axios.get).toHaveBeenCalledWith(
      poolsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      }),
    );

    // Check Phase 2 calls (Offset 100)
    expect(axios.get).toHaveBeenCalledWith(
      jobsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 100 }),
      }),
    );
    expect(axios.get).toHaveBeenCalledWith(
      poolsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 100 }),
      }),
    );

    // Hypercube should NOT have been called with offset 100 because total is 50
    expect(axios.get).not.toHaveBeenCalledWith(
      hcUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 100 }),
      }),
    );

    // Check Phase 2 calls (Offset 200)
    expect(axios.get).toHaveBeenCalledWith(
      jobsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 200 }),
      }),
    );

    // Pools should NOT have been called with offset 200 because total is 150
    expect(axios.get).not.toHaveBeenCalledWith(
      poolsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 200 }),
      }),
    );

    expect(axios.get).toHaveBeenCalledTimes(6);
  });

  it('fetches from v1 endpoint and makes a single request', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ use_brokerv2: false }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    const usageUrl = `testserver/usage/`;

    expect(axios.get).toHaveBeenCalledWith(
      usageUrl,
      expect.objectContaining({
        headers: {
          'X-Fields':
            'job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}},pool_usage{*}',
        },
        params: expect.objectContaining({
          recursive: true,
        }),
      }),
    );

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('fetches from v1 endpoint if use_brokerv2 is set to false', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ use_brokerv2: false }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    const usageUrl = `testserver/usage/`;

    expect(axios.get).toHaveBeenCalledWith(
      usageUrl,
      expect.objectContaining({
        headers: {
          'X-Fields':
            'job_usage{*,labels{*}},hypercube_job_usage{*,labels{*}},pool_usage{*}',
        },
        params: expect.objectContaining({
          recursive: true,
        }),
      }),
    );

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('cancels the fetch request when the cancel button is clicked', async () => {
    // Create a "pending" promise to freeze the component in the isLoading = true state
    let resolveRequest;
    const pendingPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    axios.get.mockImplementation((url) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] }); // Let the initial quota load finish
      }
      return pendingPromise; // The actual usage fetch will hang here
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        // Testing the non-SaaS branch here makes it easier to track the single API call
        <AllProvidersWrapperDefault options={{ is_saas: false }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    const cancelButton = await screen.findByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();

    const usageCall = axios.get.mock.calls.find((call) =>
      call[0].includes('testserver/usage/'),
    );
    const signal = usageCall[1].signal;
    expect(signal.aborted).toBe(false);

    await user.click(cancelButton);
    expect(signal.aborted).toBe(true);

    resolveRequest({ data: [] });
    // should switch back to the fetch button
    await screen.findByRole('button', { name: /Refresh/i });
  });

  it('handles different per-page limits for different endpoints correctly', async () => {
    const jobsUrl = `testserver/v2/usage/user1/jobs`;
    const hcUrl = `testserver/v2/usage/user1/hypercube`;
    const poolsUrl = `testserver/v2/usage/user1/pools`;

    axios.get.mockImplementation((url, options) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }

      const offset = options?.params?.offset || 0;
      let total = 0;
      let perPage = 100;

      if (url.includes(jobsUrl)) {
        total = 50;
        perPage = 50; // Will take 1 call (offset 0)
      } else if (url.includes(hcUrl)) {
        total = 30;
        perPage = 10; // Will take 3 calls (offset 0, 10, 20)
      } else if (url.includes(poolsUrl)) {
        total = 100;
        perPage = 25; // Will take 4 calls (offset 0, 25, 50, 75)
      }

      const remaining = Math.max(0, total - offset);
      const itemsCount = Math.min(perPage, remaining);
      const items = Array.from({ length: itemsCount }).map((_, i) => ({
        id: offset + i,
      }));

      return Promise.resolve({
        headers: {
          'x-total': total.toString(),
          'x-per-page': perPage.toString(),
        },
        data: { items },
      });
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ use_brokerv2: true }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));
    await waitFor(() => screen.findByText('Refresh Data'));

    // Wait until the final pool request (offset 75) has been made to ensure the while loop finished
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        poolsUrl,
        expect.objectContaining({
          params: expect.objectContaining({ offset: 75 }),
        }),
      );
    });

    // Jobs: total 50, perPage 50 -> exactly 1 call at offset 0
    const jobsCalls = axios.get.mock.calls.filter((call) =>
      call[0].includes(jobsUrl),
    );
    expect(jobsCalls.length).toBe(1);
    expect(jobsCalls[0][1].params.offset).toBe(0);

    // Hypercube: total 30, perPage 10 -> exactly 3 calls at offsets 0, 10, 20
    const hcCalls = axios.get.mock.calls.filter((call) =>
      call[0].includes(hcUrl),
    );
    expect(hcCalls.length).toBe(3);
    expect(hcCalls[0][1].params.offset).toBe(0);
    expect(hcCalls[1][1].params.offset).toBe(10);
    expect(hcCalls[2][1].params.offset).toBe(20);

    // Pools: total 100, perPage 25 -> exactly 4 calls at offsets 0, 25, 50, 75
    const poolsCalls = axios.get.mock.calls.filter((call) =>
      call[0].includes(poolsUrl),
    );
    expect(poolsCalls.length).toBe(4);
    expect(poolsCalls[0][1].params.offset).toBe(0);
    expect(poolsCalls[1][1].params.offset).toBe(25);
    expect(poolsCalls[2][1].params.offset).toBe(50);
    expect(poolsCalls[3][1].params.offset).toBe(75);
  });

  it('More than 1000 items should require user confirmation', async () => {
    let resolveDelayedRequest;
    let delayedPromise;

    axios.get.mockImplementation((url, options) => {
      if (url.includes('/usage/quota')) {
        return Promise.resolve({ data: [] });
      }

      const offset = options?.params?.offset || 0;
      const perPage = 100;
      let total = 0;

      // Define how many total items exist for each endpoint
      if (url.includes('/usage/user1/jobs')) total = 650;
      else if (url.includes('/usage/user1/hypercube')) total = 50;
      else if (url.includes('/usage/user1/pools')) total = 350;

      const remaining = Math.max(0, total - offset);
      const itemsCount = Math.min(perPage, remaining);
      const items = Array.from({ length: itemsCount }).map((_, i) => ({
        id: offset + i,
      }));

      const response = {
        headers: {
          'x-total': total.toString(),
          'x-per-page': perPage.toString(),
        },
        data: { items },
      };

      if (url.includes('/usage/user1/jobs') && offset === 600) {
        delayedPromise = new Promise((resolve) => {
          resolveDelayedRequest = () => resolve(response);
        });
        return delayedPromise;
      }

      return Promise.resolve(response);
    });

    render(getUsageComponent({ userToEditRoles: ['admin'] }), {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ use_brokerv2: true }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText('Show Invitees?'));

    const jobsUrl = `testserver/v2/usage/user1/jobs`;
    const hcUrl = `testserver/v2/usage/user1/hypercube`;
    const poolsUrl = `testserver/v2/usage/user1/pools`;

    // Check Phase 1 calls (Offset 0)
    expect(axios.get).toHaveBeenCalledWith(
      jobsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      }),
    );
    expect(axios.get).toHaveBeenCalledWith(
      hcUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      }),
    );
    expect(axios.get).toHaveBeenCalledWith(
      poolsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 0 }),
      }),
    );

    // Phase 2 calls should not have been called as user confirmation is pending
    expect(axios.get).not.toHaveBeenCalledWith(
      jobsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 100 }),
      }),
    );

    const loadAllButton = await screen.findByRole('button', {
      name: /Load All Data/i,
    });
    expect(loadAllButton).toBeInTheDocument();
    await user.click(loadAllButton);

    const progressBar = await screen.findByRole('progressbar');

    const testProgress = 86;

    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: `${testProgress}%` });
    expect(progressBar).toHaveTextContent(`${testProgress}%`);
    expect(progressBar).toHaveAttribute(
      'aria-valuenow',
      testProgress.toString(),
    );

    resolveDelayedRequest();

    await waitFor(() => {
      expect(progressBar).not.toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith(
      poolsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 100 }),
      }),
    );

    // Hypercube should NOT have been called with offset 100 because total is 50
    expect(axios.get).not.toHaveBeenCalledWith(
      hcUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 100 }),
      }),
    );

    // Check Phase 2 calls (Offset 600)
    expect(axios.get).toHaveBeenCalledWith(
      jobsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 600 }),
      }),
    );

    // Pools should NOT have been called with offset 400 because total is 350
    expect(axios.get).not.toHaveBeenCalledWith(
      poolsUrl,
      expect.objectContaining({
        params: expect.objectContaining({ offset: 400 }),
      }),
    );

    expect(axios.get).toHaveBeenCalledTimes(12);
  });

  describe('date range picker handling', () => {
    beforeEach(async () => {
      renderUsageForDateTests();
      await waitFor(() => screen.findByText('Show Invitees?'));
      expect(mockDateTimePickerProps).toBeTruthy();
    });

    it('caps a newly added end date to now when it falls in the future', () => {
      const start = dayjs().subtract(10, 'day').toDate();

      // First clear the end date, simulating the user having picked only a
      // start date so far (dateRange[1] becomes falsy).
      act(() => {
        mockDateTimePickerProps.onChange([start, null]);
      });
      expect(mockDateTimePickerProps.value[1]).toBeNull();

      // Now pick an end date far in the future.
      const futureEnd = dayjs().add(5, 'day').toDate();
      act(() => {
        mockDateTimePickerProps.onChange([start, futureEnd]);
      });

      const cappedEnd = mockDateTimePickerProps.value[1];
      expect(cappedEnd).toBeInstanceOf(Date);
      expect(cappedEnd.getTime()).toBeLessThan(futureEnd.getTime());
      expect(cappedEnd.getTime()).toBeLessThanOrEqual(Date.now());
      expect(cappedEnd.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('sets the exact end of day when an end date is added for the first time in the past', () => {
      const start = dayjs().subtract(10, 'day').toDate();

      act(() => {
        mockDateTimePickerProps.onChange([start, null]);
      });
      expect(mockDateTimePickerProps.value[1]).toBeNull();

      const pastEnd = dayjs().subtract(3, 'day').hour(10).toDate();
      act(() => {
        mockDateTimePickerProps.onChange([start, pastEnd]);
      });

      const expected = dayjs(pastEnd).endOf('day').toDate();
      expect(mockDateTimePickerProps.value[1].getTime()).toBe(
        expected.getTime(),
      );
    });

    it('updates the end date to end-of-day when the user changes the calendar day of the end date', () => {
      // Initial dateRange[1] is "now" (today), so picking an end date on a
      // different day should trigger the "calendar day changed" branch.
      const start = dayjs().subtract(10, 'day').toDate();
      const newEnd = dayjs().subtract(2, 'day').hour(9).toDate();

      act(() => {
        mockDateTimePickerProps.onChange([start, newEnd]);
      });

      const expected = dayjs(newEnd).endOf('day').toDate();
      expect(mockDateTimePickerProps.value[1].getTime()).toBe(
        expected.getTime(),
      );
    });

    it('caps the end time to now when adjusting the time slider past the current time on the same day', () => {
      // Same calendar day as the initial "now" end date, but a time later
      // than "now" -> should be capped to "now" rather than end-of-day.
      const start = dayjs().subtract(10, 'day').toDate();
      const newEnd = dayjs().endOf('day').toDate();

      act(() => {
        mockDateTimePickerProps.onChange([start, newEnd]);
      });

      const value = mockDateTimePickerProps.value[1];
      expect(value.getTime()).toBeLessThan(newEnd.getTime());
      expect(value.getTime()).toBeLessThanOrEqual(Date.now());
      expect(value.getTime()).toBeGreaterThan(Date.now() - 5000);
    });

    it('keeps the exact time selection when adjusting the time slider within the past on the same day', () => {
      // Same calendar day as the initial "now" end date, and the time is
      // still in the past -> the user's exact selection should be kept as-is.
      const start = dayjs().subtract(10, 'day').toDate();
      const newEnd = dayjs().startOf('day').toDate();

      act(() => {
        mockDateTimePickerProps.onChange([start, newEnd]);
      });

      const value = mockDateTimePickerProps.value;
      expect(value[0]).toBe(start);
      expect(value[1]).toBe(newEnd);
    });

    it('updates the selected date range and refetches when the dropdown closes with a changed range', async () => {
      const callsBefore = axios.get.mock.calls.filter(
        (call) => call[0] === 'testserver/usage/',
      ).length;

      const newStart = dayjs().subtract(20, 'day').toDate();
      const newEnd = dayjs().subtract(1, 'day').toDate();

      act(() => {
        mockDateTimePickerProps.onChange([newStart, newEnd]);
      });
      act(() => {
        mockDateTimePickerProps.onDropdownClose();
      });

      const expectedEnd = dayjs(newEnd).endOf('day').toDate();

      await waitFor(() => {
        const usageCalls = axios.get.mock.calls.filter(
          (call) => call[0] === 'testserver/usage/',
        );
        expect(usageCalls.length).toBeGreaterThan(callsBefore);
      });

      const lastCall = axios.get.mock.calls
        .filter((call) => call[0] === 'testserver/usage/')
        .pop();
      expect(lastCall[1].params.from_datetime).toBe(newStart.toISOString());
      expect(lastCall[1].params.to_datetime).toBe(expectedEnd.toISOString());
    });

    it('does not change the selected date range when the dropdown closes without any changes', async () => {
      const callsBefore = axios.get.mock.calls.filter(
        (call) => call[0] === 'testserver/usage/',
      ).length;

      act(() => {
        mockDateTimePickerProps.onDropdownClose();
      });

      // Allow any potential microtask/effect queue to flush.
      await act(async () => {
        await Promise.resolve();
      });

      const callsAfter = axios.get.mock.calls.filter(
        (call) => call[0] === 'testserver/usage/',
      ).length;
      expect(callsAfter).toBe(callsBefore);
    });
  });
});
