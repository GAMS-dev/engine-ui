import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import GroupActionsButtonGroup from '../components/GroupActionsButtonGroup';

vi.mock('axios');

describe('GroupActionsButtonGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders GroupActionsButtonGroup correctly', async () => {
    render(
      <GroupActionsButtonGroup
        namespace={{ permission: 10 }}
        roles={['admin']}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByText(/Show Members/));
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('does not show Delete button when roles lack admin/inviter', () => {
    render(
      <GroupActionsButtonGroup namespace={{ permission: 10 }} roles={[]} />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.getByText(/Show Members/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('does not show Delete button when namespace permission lacks write bit', () => {
    render(
      <GroupActionsButtonGroup
        namespace={{ permission: 1 }}
        roles={['admin']}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('opens the confirm dialog and cancel closes it', async () => {
    render(
      <GroupActionsButtonGroup
        id="mygroup"
        namespace={{ name: 'myns', permission: 10 }}
        roles={['admin']}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();
    expect(screen.getByText(/mygroup/)).toBeInTheDocument();
    expect(screen.getByText(/myns/)).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete the group:/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('deletes the group successfully and refreshes', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <GroupActionsButtonGroup
        id="mygroup"
        namespace={{ name: 'myns', permission: 10 }}
        roles={['admin']}
        server="testserver"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
    expect(axios.delete).toHaveBeenCalledWith(
      'testserver/namespaces/myns/user-groups',
      { params: { label: 'mygroup' } },
    );
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows an alert message when deleting the group fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <GroupActionsButtonGroup
          id="mygroup"
          namespace={{ name: 'myns', permission: 10 }}
          roles={['admin']}
          server="testserver"
          setRefresh={vi.fn()}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems deleting user group. Error message: Test error',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });
});
