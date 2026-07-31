import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import GroupMembers from '../components/GroupMembers';
import axios from 'axios';
import AlertContext from '../contexts/AlertContext';

vi.mock('axios');

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router';

const invitees = (usernames) => ({
  status: 200,
  data: usernames.map((username) => ({ username })),
});

const groupData = (label, members) => ({
  status: 200,
  data: [
    {
      label,
      created_at: '2021-08-04T17:10:15.000000+00:00',
      created_by: { username: 'admin', deleted: false, old_username: null },
      owned_by: 'admin',
      members,
    },
  ],
});

describe('GroupMembers', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.mocked(useParams).mockReturnValue({
      namespace: 'global',
      label: 'group1',
    });

    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.resolve(invitees(['user1']));
      }
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username,deleted'
      ) {
        return Promise.resolve({
          status: 200,
          data: [{ username: 'user1', deleted: false }],
        });
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(
          groupData('group1', [
            {
              username: 'user1',
              added_at: '2021-08-04T17:10:15.000000+00:00',
              added_by: { username: 'admin', deleted: false },
            },
          ]),
        );
      }
      return Promise.reject(new Error('not found'));
    });
  });

  it('renders GroupMembers correctly', async () => {
    render(<GroupMembers namespace="global" label="group1" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: 'Username Added Added By Actions' }),
      ).toBeInTheDocument();
    });
    await waitFor(() => screen.findByText('user1'));
  });

  it('hides the Add Member button and shows a dash in Actions for non-inviters', async () => {
    render(<GroupMembers />, {
      wrapper: (props) => (
        <AllProvidersWrapperDefault {...props} options={{ roles: [] }} />
      ),
    });
    await waitFor(() => screen.findByText('user1'));
    expect(screen.queryByText('Add Member')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('shows an alert if fetching the invitee list fails', async () => {
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.reject(new Error('invitees fetch failed'));
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(groupData('group1', []));
      }
      return Promise.reject(new Error('not found'));
    });
    const setAlertMsg = vi.fn();
    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <GroupMembers />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems while loading users. Error message: invitees fetch failed.',
      ),
    );
  });

  it('shows an alert if fetching group members fails', async () => {
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.resolve(invitees([]));
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.reject(new Error('group members fetch failed'));
      }
      return Promise.reject(new Error('not found'));
    });
    const setAlertMsg = vi.fn();
    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <GroupMembers />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems while retrieving group members. Error message: group members fetch failed.',
      ),
    );
  });

  it('shows an empty state when there are no group members', async () => {
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.resolve(invitees([]));
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(groupData('some-other-group', []));
      }
      return Promise.reject(new Error('not found'));
    });
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('No Members'));
  });

  it('shows a dash in Actions for a member who is not an invitee', async () => {
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        // "user1" (the group member) is not part of the invitees list
        return Promise.resolve(invitees([]));
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(
          groupData('group1', [
            {
              username: 'user1',
              added_at: '2021-08-04T17:10:15.000000+00:00',
              added_by: { username: 'admin', deleted: false },
            },
          ]),
        );
      }
      return Promise.reject(new Error('not found'));
    });
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    const row = await screen.findByRole('row', {
      name: /user1/,
    });
    expect(within(row).getByRole('cell', { name: '-' })).toBeInTheDocument();
  });

  it('opens the add member dialog and adds a user', async () => {
    axios.post.mockResolvedValue({ status: 200 });
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('user1'));
    await user.click(screen.getByText('Add Member'));
    await waitFor(() => screen.findByText('No users found that can be added.'));
  });

  it('shows the available users and submits the selected user', async () => {
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.resolve(invitees(['user1']));
      }
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username,deleted'
      ) {
        return Promise.resolve({
          status: 200,
          data: [
            { username: 'user1', deleted: false },
            { username: 'user2', deleted: false },
            { username: 'deleteduser', deleted: true },
          ],
        });
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(
          groupData('group1', [
            {
              username: 'user1',
              added_at: '2021-08-04T17:10:15.000000+00:00',
              added_by: { username: 'admin', deleted: false },
            },
          ]),
        );
      }
      return Promise.reject(new Error('not found'));
    });
    axios.post.mockResolvedValue({ status: 200 });
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('user1'));
    await user.click(screen.getByText('Add Member'));
    // user1 is already a member and deleteduser is deleted, so only user2 remains
    await waitFor(() => screen.findByText('user2'));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        'testserver/namespaces/global/user-groups/group1',
        null,
        { params: { username: 'user2' } },
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByText(/Add Member to Group:/),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows an error if adding a user to the group fails', async () => {
    axios.post.mockRejectedValue(new Error('add member failed'));
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.resolve(invitees(['user1']));
      }
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username,deleted'
      ) {
        return Promise.resolve({
          status: 200,
          data: [{ username: 'user2', deleted: false }],
        });
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(groupData('group1', []));
      }
      return Promise.reject(new Error('not found'));
    });
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('No Members'));
    await user.click(screen.getByText('Add Member'));
    await waitFor(() => screen.findByText('user2'));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      screen.findByText(
        'Problems while adding user to group: group1. Error message: add member failed.',
      ),
    );
  });

  it('shows an error if loading the users for the add member dialog fails', async () => {
    axios.get.mockImplementation((url, config) => {
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username'
      ) {
        return Promise.resolve(invitees([]));
      }
      if (
        url === 'testserver/users/' &&
        config?.headers?.['X-Fields'] === 'username,deleted'
      ) {
        return Promise.reject(new Error('users fetch failed'));
      }
      if (url === 'testserver/namespaces/global/user-groups') {
        return Promise.resolve(groupData('group1', []));
      }
      return Promise.reject(new Error('not found'));
    });
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('No Members'));
    await user.click(screen.getByText('Add Member'));
    await waitFor(() =>
      screen.findByText(
        'Problems while loading users. Error message: users fetch failed.',
      ),
    );
  });

  it('closes the add member dialog when cancel is pressed', async () => {
    render(<GroupMembers />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() => screen.findByText('user1'));
    await user.click(screen.getByText('Add Member'));
    await waitFor(() => screen.findByText('No users found that can be added.'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByText('No users found that can be added.'),
      ).not.toBeInTheDocument(),
    );
  });
});
