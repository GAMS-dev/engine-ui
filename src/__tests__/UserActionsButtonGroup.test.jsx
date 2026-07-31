import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import UserActionsButtonGroup from '../components/UserActionsButtonGroup';

describe('UserActionsButtonGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  it('renders UserActionsButtonGroup correctly', async () => {
    render(
      <UserActionsButtonGroup
        isAdmin={true}
        username="user1"
        me="admin"
        setUserToDelete={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Delete'));
  });

  it('does not show Delete for the admin user', () => {
    render(
      <UserActionsButtonGroup
        isAdmin={true}
        username="admin"
        me="admin"
        setUserToDelete={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('does not show Delete when setUserToDelete is not provided', () => {
    render(
      <UserActionsButtonGroup isAdmin={true} username="user1" me="admin" />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('does not show Delete for an inviter looking at themselves', () => {
    render(
      <UserActionsButtonGroup
        isInviter={true}
        username="me"
        me="me"
        setUserToDelete={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('shows Delete for an inviter looking at someone else', () => {
    render(
      <UserActionsButtonGroup
        isInviter={true}
        username="otheruser"
        me="me"
        setUserToDelete={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows a Copy token button for pending invitations in a secure context', () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });
    render(
      <UserActionsButtonGroup
        isAdmin={true}
        username=""
        id="token1234"
        me="admin"
        setUserToDelete={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.getByRole('button', { name: 'Copy token' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('does not show the Copy token button for invitations in an insecure context', () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: false,
    });
    render(
      <UserActionsButtonGroup
        isAdmin={true}
        username=""
        id="token1234"
        me="admin"
        setUserToDelete={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.queryByRole('button', { name: 'Copy token' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('copies the invitation token and shows a success alert', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <UserActionsButtonGroup
          isAdmin={true}
          username=""
          id="token1234"
          me="admin"
          setUserToDelete={vi.fn()}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Copy token' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('token1234');
    expect(setAlertMsg).toHaveBeenCalledWith(
      'success:Token copied to clipboard!',
    );
  });

  it('sets up deletion of a regular user when Delete is clicked', async () => {
    const setUserToDelete = vi.fn();
    const setDeleteInvitation = vi.fn();
    const handleShowDeleteConfirmDialog = vi.fn();

    render(
      <UserActionsButtonGroup
        isAdmin={true}
        username="user1"
        userroles={['user']}
        me="admin"
        setUserToDelete={setUserToDelete}
        setDeleteInvitation={setDeleteInvitation}
        handleShowDeleteConfirmDialog={handleShowDeleteConfirmDialog}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(setDeleteInvitation).toHaveBeenCalledWith(false);
    expect(setUserToDelete).toHaveBeenCalledWith({
      username: 'user1',
      roles: ['user'],
    });
    expect(handleShowDeleteConfirmDialog).toHaveBeenCalled();
  });

  it('sets up deletion of a pending invitation when Delete is clicked', async () => {
    const setUserToDelete = vi.fn();
    const setDeleteInvitation = vi.fn();
    const handleShowDeleteConfirmDialog = vi.fn();

    render(
      <UserActionsButtonGroup
        isAdmin={true}
        username=""
        id="token1234"
        userroles={['user']}
        me="admin"
        setUserToDelete={setUserToDelete}
        setDeleteInvitation={setDeleteInvitation}
        handleShowDeleteConfirmDialog={handleShowDeleteConfirmDialog}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(setDeleteInvitation).toHaveBeenCalledWith(true);
    expect(setUserToDelete).toHaveBeenCalledWith({
      username: 'token1234',
      roles: ['user'],
    });
    expect(handleShowDeleteConfirmDialog).toHaveBeenCalled();
  });
});
