import { within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserInstanceUpdateForm from '../components/UserInstanceUpdateForm';

vi.mock('axios');

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router';

describe('UserInstanceUpdateForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user1' });

    axios.get.mockImplementation((url, paramsRaw) => {
      let params;
      if (paramsRaw != null) {
        ({ params } = paramsRaw);
      }
      // user 2 inherits instances from user1 and default from admin
      // user1 doesn't
      switch (url) {
        case 'testserver/users/':
          if (params?.username === 'user1') {
            return Promise.resolve({
              status: 200,
              data: [
                {
                  username: 'user1',
                  roles: [],
                  deleted: false,
                  inviter_name: 'admin',
                  identity_provider: 'gams_engine',
                  identity_provider_user_subject: 'user1',
                },
              ],
            });
          } else if (params.username === 'user2') {
            return Promise.resolve({
              status: 200,
              data: [
                {
                  username: 'user2',
                  roles: [],
                  deleted: false,
                  inviter_name: 'user1',
                  identity_provider: 'gams_engine',
                  identity_provider_user_subject: 'user1',
                },
              ],
            });
          } else if (params.username === 'user3') {
            return Promise.resolve({
              status: 200,
              data: [
                {
                  username: 'user3',
                  roles: [],
                  deleted: false,
                  inviter_name: 'admin',
                  identity_provider: 'gams_engine',
                  identity_provider_user_subject: 'user3',
                },
              ],
            });
          } else if (params.username === 'missinguser') {
            return Promise.resolve({
              status: 200,
              data: [],
            });
          } else if (params.username === 'noinstuser') {
            return Promise.resolve({
              status: 200,
              data: [
                {
                  username: 'noinstuser',
                  roles: [],
                  deleted: false,
                  inviter_name: null,
                  identity_provider: 'gams_engine',
                  identity_provider_user_subject: 'noinstuser',
                },
              ],
            });
          } else if (params.username === 'erroruser') {
            return Promise.reject(new Error('server down'));
          } else if (params.username === 'admin2') {
            return Promise.resolve({
              status: 200,
              data: [
                {
                  username: 'admin2',
                  roles: ['admin'],
                  deleted: false,
                  inviter_name: null,
                  identity_provider: 'gams_engine',
                  identity_provider_user_subject: 'admin2',
                },
              ],
            });
          } else {
            return Promise.reject(new Error('not found'));
          }
        case 'testserver/usage/pools/noinstuser':
          return Promise.resolve({
            status: 200,
            data: { instance_pools_available: [] },
          });
        case 'testserver/usage/instances/noinstuser':
          return Promise.resolve({
            status: 200,
            data: { instances_inherited_from: null, instances_available: [] },
          });
        case 'testserver/usage/instances/noinstuser/default':
          return Promise.resolve({
            status: 200,
            data: { default_instance: null, default_inherited_from: null },
          });
        case 'testserver/usage/pools/admin2':
          return Promise.resolve({
            status: 200,
            data: { instance_pools_available: [] },
          });
        case 'testserver/usage/instances/admin2':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: null,
              instances_available: [
                {
                  label: 'TestInstance',
                  cpu_request: 3,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 3,
                  multiplier_idle: 3,
                },
                {
                  label: 'Test2',
                  cpu_request: 2,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 6,
                  multiplier_idle: 6,
                },
              ],
            },
          });
        case 'testserver/usage/instances/admin2/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: {
                label: 'TestInstance',
                cpu_request: 3,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 3,
                multiplier_idle: 3,
              },
              default_inherited_from: null,
            },
          });
        case 'testserver/usage/pools/user1':
          return Promise.resolve({
            status: 200,
            data: {
              instance_pools_available: [],
            },
          });
        case 'testserver/usage/pools/user2':
          return Promise.resolve({
            status: 200,
            data: {
              instance_pools_available: [],
            },
          });
        case 'testserver/usage/pools/user3':
          return Promise.resolve({
            status: 200,
            data: {
              instance_pools_available: [
                {
                  label: 'test_pool',
                  owner: {
                    username: 'user3',
                    deleted: false,
                    old_username: null,
                  },
                  instance: {
                    label: 'medium',
                    cpu_request: 1,
                    memory_request: 100,
                    workspace_request: 100,
                    node_selectors: [],
                    tolerations: [],
                    multiplier: 1,
                    multiplier_idle: 1,
                  },
                  size: 0,
                  size_active: 0,
                  size_busy: 0,
                  cancelling: false,
                },
              ],
            },
          });
        case 'testserver/usage/pools/admin':
          return Promise.resolve({
            status: 200,
            data: {
              instance_pools_available: [],
            },
          });
        case 'testserver/usage/instances/user1':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: 'user1',
              default_inherited_from: 'user1',
              instances_available: [
                {
                  label: 'TestInstance',
                  cpu_request: 3,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 3,
                  multiplier_idle: 3,
                },
                {
                  label: 'Test2',
                  cpu_request: 2,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 6,
                  multiplier_idle: 6,
                },
              ],
              default_instance: {
                label: 'TestInstance',
                cpu_request: 3,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 3,
                multiplier_idle: 3,
              },
            },
          });
        case 'testserver/usage/instances/user2':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: 'user1',
              default_inherited_from: 'user1',
              instances_available: [
                {
                  label: 'TestInstance',
                  cpu_request: 3,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 3,
                  multiplier_idle: 3,
                },
                {
                  label: 'Test2',
                  cpu_request: 2,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 6,
                  multiplier_idle: 6,
                },
              ],
              default_instance: {
                label: 'TestInstance',
                cpu_request: 3,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 3,
                multiplier_idle: 3,
              },
            },
          });
        case 'testserver/usage/instances/user3':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: 'user3',
              default_inherited_from: 'user3',
              instances_available: [
                {
                  label: 'small',
                  cpu_request: 1,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 1,
                  multiplier_idle: 1,
                },
                {
                  label: 'medium',
                  cpu_request: 1,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 1,
                  multiplier_idle: 1,
                },
              ],
              default_instance: {
                label: 'small',
                cpu_request: 1,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 1,
                multiplier_idle: 1,
              },
            },
          });
        case 'testserver/usage/instances/user1/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: {
                label: 'TestInstance',
                cpu_request: 3,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 3,
                multiplier_idle: 3,
              },
              default_inherited_from: 'admin',
            },
          });
        case 'testserver/usage/instances/user2/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: {
                label: 'TestInstance',
                cpu_request: 3,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 3,
                multiplier_idle: 3,
              },
              default_inherited_from: 'admin',
            },
          });
        case 'testserver/usage/instances/user3/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: {
                label: 'small',
                resource_type: 'instance',
              },
              default_inherited_from: 'user3',
            },
          });
        case 'testserver/usage/instances/admin':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: null,
              instances_available: [
                {
                  label: 'test',
                  cpu_request: 1,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 1,
                  multiplier_idle: 1,
                },
                {
                  label: 'small',
                  cpu_request: 1,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 1,
                  multiplier_idle: 1,
                },
              ],
            },
          });
        case 'testserver/usage/instances/admin/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: null,
              default_inherited_from: null,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders UserInstanceUpdateForm correctly', async () => {
    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/raw resource /));
  });

  it('renders UserInstanceUpdateForm correctly for user who inherits', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user2' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Inherit instances from/));
    expect(screen.getByText('Inherit instances from')).toBeInTheDocument();
    expect(
      screen.getByText('Inherit default instance from'),
    ).toBeInTheDocument();
    expect(screen.getByText('(Test2, TestInstance)')).toBeInTheDocument();
    expect(screen.getByText('(TestInstance)')).toBeInTheDocument();

    expect(screen.getByText('user1').closest('a')).toHaveAttribute(
      'href',
      '/users/user1',
    );
    expect(screen.getByText('admin').closest('a')).toHaveAttribute(
      'href',
      '/users/admin',
    );
  });

  it('if inherit checkboxes uncheck do not show inheritance information', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user2' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Inherit instances from/));
    const checkbox = screen.getByRole('checkbox', {
      name: /inherit instances from user1/i,
    });
    await user.click(checkbox);
    expect(screen.queryByText('(Test2, TestInstance)')).toBeNull();
    expect(screen.queryByText('(TestInstance)')).toBeNull();
  });

  it('if default inherit checkboxes uncheck do not show inheritance information', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user2' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Inherit instances from/));

    const checkbox = screen.getByRole('checkbox', {
      name: (content) => {
        return (
          content.includes('Inherit default instance') &&
          content.includes('admin')
        );
      },
    });
    await user.click(checkbox);
    expect(screen.queryByText('(Test2, TestInstance)')).toBeInTheDocument();
    expect(screen.queryByText('(TestInstance)')).toBeNull();
  });

  it('works to remove instance updates default instance selector', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user3' });
    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Instances user is allowed to use/));
    const instancesAllowedDropdown = within(
      document.getElementById('instancesAllowedDD'),
    );
    const defaultInstanceDropdown = within(
      document.getElementById('instancesDefaultDD'),
    );
    expect(instancesAllowedDropdown.getByText(/small/)).toBeInTheDocument();
    expect(instancesAllowedDropdown.getByText(/medium/)).toBeInTheDocument();
    expect(instancesAllowedDropdown.getByText(/test_pool/)).toBeInTheDocument();
    expect(defaultInstanceDropdown.getByText(/small/)).toBeInTheDocument();
    expect(screen.queryByText(/Delete all pools/)).toBeNull();

    await user.click(instancesAllowedDropdown.getByLabelText(/Remove medium/i));
    expect(instancesAllowedDropdown.queryByText(/medium/)).toBeNull();
    expect(defaultInstanceDropdown.getByText(/small/)).toBeInTheDocument();
    expect(screen.queryByText(/Delete all pools/)).toBeInTheDocument();

    await user.click(instancesAllowedDropdown.getByLabelText(/Remove small/i));
    expect(instancesAllowedDropdown.queryByText(/medium/)).toBeNull();
    expect(defaultInstanceDropdown.queryByText(/small/)).toBeNull();
    expect(defaultInstanceDropdown.getByText(/test_pool/)).toBeInTheDocument();
  });

  it('shows an error message when the user is not found', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'missinguser' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('User not found.'));
  });

  it('shows an error message when no instances are available', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'noinstuser' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('No instances available.'));
  });

  it('shows an error message when fetching required data fails', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'erroruser' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() =>
      screen.findByText(
        /Problems while while retrieving user instances\. Error message: server down\./,
      ),
    );
  });

  it('hides inherit checkboxes and shows the default instance selector for an admin user', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'admin2' });

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText('Default Instance'));
    expect(screen.queryByText(/Inherit instances from/)).toBeNull();
    expect(screen.queryByText(/Allowed to use any instance/)).toBeNull();
  });

  it('submits successfully for a user who inherits instances by calling the delete endpoint', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user2' });
    axios.delete.mockResolvedValue({ status: 200 });
    const routes = [
      { path: '/users/user2', element: <p>after submit went to user2</p> },
    ];
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault options={{ routes }}>
        {children}
      </AllProvidersWrapperDefault>
    );

    render(<UserInstanceUpdateForm />, { wrapper: Wrapper });

    await waitFor(() => screen.findByText(/Inherit instances from/));
    await user.click(screen.getByRole('button', { name: 'Update Instances' }));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/usage/instances/user2',
      ),
    );
    await waitFor(() => screen.findByText(/after submit went to user2/));
  });

  it('shows an error message when the delete-based submission fails', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user2' });
    axios.delete.mockRejectedValue(new Error('delete failed'));

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Inherit instances from/));
    await user.click(screen.getByRole('button', { name: 'Update Instances' }));

    await waitFor(() =>
      screen.findByText(
        /An error occurred while updating user instances\. Error message: delete failed\./,
      ),
    );
  });

  it('submits successfully for a non-inheriting user by calling the labels endpoint', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user3' });
    axios.put.mockResolvedValue({ status: 200 });
    const routes = [
      { path: '/users/user3', element: <p>after submit went to user3</p> },
    ];
    const Wrapper = ({ children }) => (
      <AllProvidersWrapperDefault options={{ routes }}>
        {children}
      </AllProvidersWrapperDefault>
    );

    render(<UserInstanceUpdateForm />, { wrapper: Wrapper });

    await waitFor(() => screen.findByText(/Instances user is allowed to use/));
    await user.click(screen.getByRole('button', { name: 'Update Instances' }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        'testserver/usage/instances/user3',
        expect.objectContaining({ default_label: 'small' }),
      ),
    );
    await waitFor(() => screen.findByText(/after submit went to user3/));
  });

  it('shows an error message when the labels-based submission fails', async () => {
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'user3' });
    axios.put.mockRejectedValue(new Error('put failed'));

    render(<UserInstanceUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Instances user is allowed to use/));
    await user.click(screen.getByRole('button', { name: 'Update Instances' }));

    await waitFor(() =>
      screen.findByText(
        /An error occurred while updating user instances\. Error message: put failed\./,
      ),
    );
  });
});
