import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserInviteesTree from '../components/UserInviteesTree';

vi.mock('axios');

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router';

describe('UserInviteesTree', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({
      userToEdit: 'mainuser',
    });
    vi.mocked(axios.get).mockImplementation((url) => {
      switch (url) {
        case 'testserver/users/':
          return Promise.resolve({
            status: 200,
            data: [
              {
                username: 'mainuser',
                roles: ['admin'],
                deleted: false,
                old_username: null,
                inviter_name: null,
                invitation_time: null,
                identity_provider: 'gams_engine',
                identity_provider_user_subject: 'admin',
              },
              {
                username: 'user1',
                roles: ['user'],
                deleted: false,
                inviter_name: 'mainuser',
                invitation_time: '2024-04-08T15:17:33.046930+00:00',
                identity_provider: 'gams_engine',
                identity_provider_user_subject: 'user2',
              },
              {
                username: 'user2',
                roles: ['inviter'],
                deleted: false,
                inviter_name: 'mainuser',
                invitation_time: '2024-04-08T15:17:33.046930+00:00',
                identity_provider: 'gams_engine',
                identity_provider_user_subject: 'user2',
              },
              {
                username: 'user3',
                roles: ['user'],
                deleted: false,
                inviter_name: 'user1',
                invitation_time: '2024-04-15T12:45:39.866973+00:00',
                identity_provider: 'gams_engine',
                identity_provider_user_subject: 'user1',
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders UserInviteesTree correctly', async () => {
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/mainuser/));
  });

  it('shows all invitees', async () => {
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/mainuser/));
    // check all users ar listed
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('user3')).toBeInTheDocument();
    expect(screen.getByText('user1').closest('a')).toHaveAttribute(
      'href',
      '/users/user1',
    );
    expect(screen.getByText('user2').closest('a')).toHaveAttribute(
      'href',
      '/users/user2',
    );
    expect(screen.getByText('user3').closest('a')).toHaveAttribute(
      'href',
      '/users/user3',
    );
    // check all roles a given
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('inviter')).toBeInTheDocument();
    expect(screen.getAllByText('user')).toHaveLength(2);
  });

  it('shows "No Invitees" if no exist', async () => {
    vi.mocked(useParams).mockReturnValue({
      userToEdit: 'user2',
    });
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/user2/));
    expect(screen.getByText('No invitees')).toBeInTheDocument();
    expect(screen.queryByText('mainuser')).toBeInTheDocument();
    expect(screen.queryByText('user1')).toBeInTheDocument();
    // user1 should be closed
    expect(screen.queryByText('user3')).toBeNull();
  });

  it('closes the list if triangle is clicked ', async () => {
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/mainuser/));
    await user.click(screen.getAllByText('▼')[0]);

    expect(screen.queryByText('user1')).toBeInTheDocument();
    expect(screen.queryByText('user2')).toBeInTheDocument();
    expect(screen.queryByText('user3')).toBeNull();
  });

  it('shows whole subtree', async () => {
    vi.mocked(useParams).mockReturnValue({
      userToEdit: 'user3',
    });
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/mainuser/));
    // here expect both users before since the response is the same
    expect(screen.queryByText('mainuser')).toBeInTheDocument();
    expect(screen.queryByText('user1')).toBeInTheDocument();
  });

  it('places the user you are looking at at the top', async () => {
    vi.mocked(useParams).mockReturnValue({
      userToEdit: 'user2',
    });
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/mainuser/));
    const userElements = screen.getAllByText(/user\d/);

    const expectedOrder = ['user2', ' user1'];

    userElements.forEach((userElement, index) => {
      expect(userElement.textContent).toBe(expectedOrder[index]);
    });
  });

  it('places the subtree to the user you are looking at at the top', async () => {
    vi.mocked(useParams).mockReturnValue({
      userToEdit: 'user3',
    });
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/mainuser/));
    const userElements = screen.getAllByText(/user\d/);

    const expectedOrder = [' user1', 'user3', ' user2'];

    userElements.forEach((userElement, index) => {
      expect(userElement.textContent).toBe(expectedOrder[index]);
    });
  });

  it("keeps each sibling's expand/collapse state tied to its own username rather than its position, when navigating to a different user reorders the list", async () => {
    vi.mocked(axios.get).mockImplementation((url) => {
      switch (url) {
        case 'testserver/users/':
          return Promise.resolve({
            status: 200,
            data: [
              {
                username: 'mainuser',
                roles: ['admin'],
                deleted: false,
                inviter_name: null,
              },
              {
                username: 'childA',
                roles: ['user'],
                deleted: false,
                inviter_name: 'mainuser',
              },
              {
                username: 'childB',
                roles: ['user'],
                deleted: false,
                inviter_name: 'mainuser',
              },
              {
                username: 'childA1',
                roles: ['user'],
                deleted: false,
                inviter_name: 'childA',
              },
              {
                username: 'childB1',
                roles: ['user'],
                deleted: false,
                inviter_name: 'childB',
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    // childA is the highlighted user, so it starts expanded (showing
    // childA1) and childB starts collapsed (hiding childB1).
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'childA' });
    const { rerender } = render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('childA1'));
    expect(screen.queryByText('childB1')).toBeNull();

    // Simulate navigating to childB's page: childB moves to the front of
    // the sibling list and childA moves to the back.
    vi.mocked(useParams).mockReturnValue({ userToEdit: 'childB' });
    rerender(<UserInviteesTree />);
    await waitFor(() => screen.findByText('childB'));

    // Each node's own expand/collapse state must follow its username, not
    // whichever position it now occupies - so childA (now second) should
    // still show its own expanded state, and childB (now first) should
    // still show its own collapsed state. Keying the sibling list by
    // array index instead of username would swap these: whichever node is
    // now first inherits the *other* node's old (expanded) state.
    expect(screen.getByText('childA1')).toBeInTheDocument();
    expect(screen.queryByText('childB1')).toBeNull();
  });

  it('handles errors while retrieving', async () => {
    vi.mocked(axios.get).mockRejectedValue({
      response: {
        status: 400,
      },
    });
    render(<UserInviteesTree />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() =>
      screen.findByText(
        /Failed to fetch users information. Error message: undefined/,
      ),
    );
  });
});
