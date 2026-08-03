import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import InstancePools from '../components/InstancePools';

vi.mock('axios');

const AllProvidersWrapperDisabled = ({ children }) => (
  <AllProvidersWrapperDefault options={{ instance_pool_access: 'DISABLED' }}>
    {children}
  </AllProvidersWrapperDefault>
);

const AllProvidersWrapperEnabled = ({ children }) => (
  <AllProvidersWrapperDefault options={{ instance_pool_access: 'ENABLED' }}>
    {children}
  </AllProvidersWrapperDefault>
);

const withOptions = (options) => {
  const Wrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={options}>
      {children}
    </AllProvidersWrapperDefault>
  );
  return Wrapper;
};

const makePool = (overrides = {}) => ({
  label: 'test123',
  owner: {
    username: 'bob',
    deleted: false,
    old_username: null,
  },
  instance: {
    label: 'test',
    cpu_request: 0.3,
    memory_request: 100,
    workspace_request: 100,
    node_selectors: [],
    tolerations: [],
    multiplier: 1.0,
    multiplier_idle: 1.0,
  },
  size: 2,
  size_active: 2,
  size_busy: 0,
  cancelling: false,
  ...overrides,
});

describe('InstancePools Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders InstancePools correctly', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });

    render(<InstancePools />, {
      wrapper: AllProvidersWrapperDisabled,
    });
    await waitFor(() => screen.findByText('Instance pools disabled'));
    await waitFor(() => screen.findByText('Instance Pools'));
    await waitFor(() => screen.findByText('Enable Instance Pools'));
  });

  it('refresh button triggers API call', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { instance_pools_available: [] },
    });

    render(<InstancePools />, {
      wrapper: AllProvidersWrapperDisabled,
    });
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    const refreshButton = screen.getByText('Refresh');

    await user.click(refreshButton);

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
  });

  it('clicking enable instance pools opens modal', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    render(<InstancePools />, {
      wrapper: AllProvidersWrapperDisabled,
    });

    await user.click(screen.getByText('Enable Instance Pools'));

    await waitFor(() =>
      screen.findByText('Are you sure that you want to enable instance pools?'),
    );
  });
  it('Instance pool table renders', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        instance_pools_available: [
          {
            label: 'test123',
            owner: {
              username: 'admin',
              deleted: false,
              old_username: null,
            },
            instance: {
              label: 'test',
              cpu_request: 0.3,
              memory_request: 100,
              workspace_request: 100,
              node_selectors: [],
              tolerations: [],
              multiplier: 1.0,
              multiplier_idle: 1.0,
            },
            size: 0,
            size_active: 0,
            size_busy: 0,
            cancelling: false,
          },
        ],
      },
    });
    render(<InstancePools />, {
      wrapper: AllProvidersWrapperEnabled,
    });

    await waitFor(() => screen.findByText('Change Size'));
  });

  it('inviter role fetches the user list and grants write permission to invited, non-deleted owners', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        instance_pools_available: [
          makePool({
            owner: { username: 'bob', deleted: false, old_username: null },
          }),
        ],
      },
    });
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: [
        { username: 'bob', deleted: false, old_username: null },
        { username: 'eve', deleted: true, old_username: null },
      ],
    });

    render(<InstancePools />, {
      wrapper: withOptions({
        instance_pool_access: 'ENABLED',
        roles: ['inviter'],
        username: 'admin',
      }),
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(axios.get).toHaveBeenNthCalledWith(2, 'testserver/users/');

    // bob (the pool owner) is a non-deleted invitee, so write permission is
    // granted and the "Change Size" action renders.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Change Size' }),
      ).toBeInTheDocument(),
    );
  });

  it('filters out deleted users from the invitee list, denying write permission to a deleted owner', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: {
        instance_pools_available: [
          makePool({
            owner: { username: 'eve', deleted: true, old_username: null },
          }),
        ],
      },
    });
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: [
        { username: 'bob', deleted: false, old_username: null },
        { username: 'eve', deleted: true, old_username: null },
      ],
    });

    render(<InstancePools />, {
      wrapper: withOptions({
        instance_pool_access: 'ENABLED',
        roles: ['inviter'],
        username: 'admin',
      }),
    });

    await waitFor(() => screen.findByText('test123'));

    // eve was filtered out of the invitee list (deleted === true), and the
    // logged-in user is not an admin, so no write actions should render.
    expect(
      screen.queryByRole('button', { name: 'Change Size' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('shows an alert when fetching instance pools fails', async () => {
    const setAlertMsg = vi.fn();
    axios.get.mockRejectedValueOnce(new Error('Test error'));

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <InstancePools />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDisabled,
      },
    );

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'An error occurred fetching instances. Error message: Test error.',
      ),
    );
    // Only one call was ever made: the invitees fetch never runs after the
    // pools fetch throws.
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('opens the disable-pools modal from the toolbar and submits "Admin only" successfully', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    const setServerConfig = vi.fn().mockResolvedValueOnce(undefined);

    render(<InstancePools />, {
      wrapper: withOptions({ setServerConfig }),
    });

    await user.click(screen.getByText('Disable Instance Pools'));
    await waitFor(() =>
      screen.findByText(
        'Are you sure that you want to disable instance pools?',
      ),
    );

    await user.click(
      screen.getByRole('button', { name: 'Enable for admins only' }),
    );

    await waitFor(() =>
      expect(setServerConfig).toHaveBeenCalledWith({
        instance_pool_access: 'ADMIN_ONLY',
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(
          'Are you sure that you want to disable instance pools?',
        ),
      ).not.toBeInTheDocument(),
    );
  });

  it('opens the enable-pools modal and submits "Inviters only" successfully', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    const setServerConfig = vi.fn().mockResolvedValueOnce(undefined);

    render(<InstancePools />, {
      wrapper: withOptions({ setServerConfig }),
    });

    await user.click(screen.getByText('Enable Instance Pools'));
    await waitFor(() =>
      screen.findByText('Are you sure that you want to enable instance pools?'),
    );

    await user.click(
      screen.getByRole('button', { name: 'Enable for inviters only' }),
    );

    await waitFor(() =>
      expect(setServerConfig).toHaveBeenCalledWith({
        instance_pool_access: 'INVITER_ONLY',
      }),
    );
  });

  it('submits "Enable for everyone" from the enable-pools modal', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    const setServerConfig = vi.fn().mockResolvedValueOnce(undefined);

    render(<InstancePools />, {
      wrapper: withOptions({ setServerConfig }),
    });

    await user.click(screen.getByText('Enable Instance Pools'));
    await waitFor(() =>
      screen.findByText('Are you sure that you want to enable instance pools?'),
    );

    await user.click(
      screen.getByRole('button', { name: 'Enable for everyone' }),
    );

    await waitFor(() =>
      expect(setServerConfig).toHaveBeenCalledWith({
        instance_pool_access: 'ENABLED',
      }),
    );
  });

  it('submits "Disable" from the disable-pools modal', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    const setServerConfig = vi.fn().mockResolvedValueOnce(undefined);

    render(<InstancePools />, {
      wrapper: withOptions({ setServerConfig }),
    });

    await user.click(screen.getByText('Disable Instance Pools'));
    await waitFor(() =>
      screen.findByText(
        'Are you sure that you want to disable instance pools?',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Disable' }));

    await waitFor(() =>
      expect(setServerConfig).toHaveBeenCalledWith({
        instance_pool_access: 'DISABLED',
      }),
    );
  });

  it('shows an error and keeps the modal open when updating pool access fails', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    const setServerConfig = vi
      .fn()
      .mockRejectedValueOnce(new Error('Test error'));

    render(<InstancePools />, {
      wrapper: withOptions({ setServerConfig }),
    });

    await user.click(screen.getByText('Enable Instance Pools'));
    await waitFor(() =>
      screen.findByText('Are you sure that you want to enable instance pools?'),
    );

    await user.click(
      screen.getByRole('button', { name: 'Enable for admins only' }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems updating instance pool access configuration. Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
    // The modal stays open on failure.
    expect(
      screen.getByText('Are you sure that you want to enable instance pools?'),
    ).toBeInTheDocument();
  });

  it('cancel button closes the modal without submitting', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });
    const setServerConfig = vi.fn();

    render(<InstancePools />, {
      wrapper: withOptions({ setServerConfig }),
    });

    await user.click(screen.getByText('Enable Instance Pools'));
    await waitFor(() =>
      screen.findByText('Are you sure that you want to enable instance pools?'),
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() =>
      expect(
        screen.queryByText(
          'Are you sure that you want to enable instance pools?',
        ),
      ).not.toBeInTheDocument(),
    );
    expect(setServerConfig).not.toHaveBeenCalled();
  });

  it('closing the modal via the header close control hides it', async () => {
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { instance_pools_available: [] },
    });

    render(<InstancePools />, {
      wrapper: withOptions({}),
    });

    await user.click(screen.getByText('Enable Instance Pools'));
    await waitFor(() =>
      screen.findByText('Are you sure that you want to enable instance pools?'),
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() =>
      expect(
        screen.queryByText(
          'Are you sure that you want to enable instance pools?',
        ),
      ).not.toBeInTheDocument(),
    );
  });
});
