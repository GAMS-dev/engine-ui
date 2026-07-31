import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import GroupMemberActionsButtonGroup from '../components/GroupMemberActionsButtonGroup';

vi.mock('axios');

describe('GroupMemberActionsButtonGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders GroupMemberActionsButtonGroup correctly', async () => {
    render(
      <GroupMemberActionsButtonGroup
        namespace={{ permission: 10 }}
        roles={['admin']}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByText(/Remove/));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows a self-removal confirmation message when removing yourself', async () => {
    render(
      <GroupMemberActionsButtonGroup username="me" me="me" label="mygroup" />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(
      screen.getByText(
        "Are you sure you want to remove yourself from the group: 'mygroup'? This cannot be undone!",
      ),
    ).toBeInTheDocument();
  });

  it('shows the other-user confirmation message when removing someone else', async () => {
    render(
      <GroupMemberActionsButtonGroup
        username="otheruser"
        me="me"
        label="mygroup"
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(
      screen.getByText(
        "Are you sure you want to remove: 'otheruser' from the group: 'mygroup'?",
      ),
    ).toBeInTheDocument();
  });

  it('cancel closes the confirm dialog', async () => {
    render(<GroupMemberActionsButtonGroup username="otheruser" me="me" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('removes the member successfully and refreshes', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <GroupMemberActionsButtonGroup
        id="user-id-1"
        namespace="myns"
        server="testserver"
        username="otheruser"
        me="me"
        label="mygroup"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
    expect(axios.delete).toHaveBeenCalledWith(
      'testserver/namespaces/myns/user-groups/mygroup',
      { params: { username: 'user-id-1' } },
    );
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows an alert message when removing the member fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <GroupMemberActionsButtonGroup
          id="user-id-1"
          namespace="myns"
          server="testserver"
          username="otheruser"
          me="me"
          label="mygroup"
          setRefresh={vi.fn()}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems removing user: otheruser grom group: mygroup. Error message: Test error',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });
});
