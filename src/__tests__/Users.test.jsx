import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Users from '../components/Users';
import axios from 'axios';
import AlertContext from '../contexts/AlertContext';

vi.mock('axios');

describe('Users', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/users/':
          return Promise.resolve({
            status: 200,
            data: [
              {
                username: 'user1',
                roles: ['inviter'],
                deleted: false,
                old_username: 'test1',
                inviter_name: 'admin',
                invitation_time: '2024-04-15T12:45:39.866973+00:00',
                identity_provider: 'gams_engine',
                identity_provider_user_subject: 'user1',
              },
            ],
          });
        case 'testserver/users/invitation':
          return Promise.resolve({
            status: 200,
            data: [
              {
                token: '41f6faa9-728b-4fb6-8e85-c96386dd2246',
                inviter_name: 'admin',
                username: 'user1',
                created: '2025-01-06T10:42:05.345218+00:00',
                used: true,
                roles: ['inviter'],
                permissions: [],
                quota: {
                  parallel_quota: null,
                  volume_quota: null,
                  disk_quota: null,
                },
                user_groups: [],
                gams_license: null,
                identity_provider: 'gams_engine',
                identity_provider_user_subject: null,
                invitable_identity_providers: ['gams_engine'],
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders Users correctly', async () => {
    render(<Users />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Users'));
  });

  it('refreshes the user list when the refresh button is clicked', async () => {
    render(<Users />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('user1'));
    const callsBefore = axios.get.mock.calls.length;

    await user.click(screen.getByRole('button', { name: /Refresh/ }));

    await waitFor(() =>
      expect(axios.get.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it('hides the invite link and skips the invitations query for a user without roles', async () => {
    render(
      <AllProvidersWrapperDefault options={{ roles: [] }}>
        <Users />
      </AllProvidersWrapperDefault>,
    );
    await waitFor(() => screen.findByText('user1'));

    expect(screen.queryByText('Invite User')).toBeNull();
    expect(axios.get).not.toHaveBeenCalledWith(
      'testserver/users/invitation',
      expect.anything(),
    );
  });

  it('shows the delete-children checkbox and deletes a user with roles', async () => {
    axios.delete.mockResolvedValue({ status: 200 });

    render(<Users />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('user1'));

    const row = screen.getByText('user1').closest('tr');
    const deleteButton = row.querySelector('button.btn-outline-danger');
    await user.click(deleteButton);

    await waitFor(() => screen.findByText(/Please Confirm/));
    expect(screen.getByText(/remove the user/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Also delete all invitees/)).toBeChecked();

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('testserver/users/', {
        params: {
          username: 'user1',
          delete_results: false,
          delete_children: true,
        },
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText(/Please Confirm/)).toBeNull(),
    );
  });

  it('deletes an invitation from an unregistered row using the token', async () => {
    axios.delete.mockResolvedValue({ status: 200 });

    render(<Users />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/unregistered/));

    const row = screen.getByText(/unregistered/).closest('tr');
    const deleteButton = row.querySelector('button.btn-outline-danger');
    await user.click(deleteButton);

    await waitFor(() => screen.findByText(/Please Confirm/));
    expect(screen.getByText(/remove the invitation/)).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('testserver/users/invitation', {
        params: { token: '41f6faa9-728b-4fb6-8e85-c96386dd2246' },
      }),
    );
  });

  it('logs the current user out after deleting themselves', async () => {
    axios.delete.mockResolvedValue({ status: 200 });
    const routes = [{ path: '/logout', element: <p>logged out</p> }];

    render(
      <AllProvidersWrapperDefault options={{ username: 'user1', routes }}>
        <Users />
      </AllProvidersWrapperDefault>,
    );
    await waitFor(() => screen.findByText('user1'));

    const row = screen.getByText('user1').closest('tr');
    const deleteButton = row.querySelector('button.btn-outline-danger');
    await user.click(deleteButton);

    await waitFor(() => screen.findByText(/Please Confirm/));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => screen.findByText('logged out'));
  });

  it('sets an alert message when deleting a user fails', async () => {
    axios.delete.mockRejectedValue(new Error('delete failed'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <AllProvidersWrapperDefault>
          <Users />
        </AllProvidersWrapperDefault>
      </AlertContext.Provider>,
    );
    await waitFor(() => screen.findByText('user1'));

    const row = screen.getByText('user1').closest('tr');
    const deleteButton = row.querySelector('button.btn-outline-danger');
    await user.click(deleteButton);
    await waitFor(() => screen.findByText(/Please Confirm/));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        expect.stringContaining('Problems deleting user'),
      ),
    );
  });

  it('sets an alert message when fetching users fails', async () => {
    axios.get.mockImplementation(() => Promise.reject(new Error('boom')));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <AllProvidersWrapperDefault>
          <Users />
        </AllProvidersWrapperDefault>
      </AlertContext.Provider>,
    );

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        expect.stringContaining('Problems fetching user information'),
      ),
    );
  });
});
