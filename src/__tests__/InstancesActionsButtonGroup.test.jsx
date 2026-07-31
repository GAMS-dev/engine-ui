import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import InstancesActionsButtonGroup from '../components/InstancesActionsButtonGroup';

vi.mock('axios');

describe('InstancesActionsButtonGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders InstancesActionsButtonGroup correctly', async () => {
    render(<InstancesActionsButtonGroup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update/));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(
      screen.getByText(/Are you sure you want to remove the instance/),
    ).toBeInTheDocument();
  });

  it('cancel closes the confirm dialog', async () => {
    render(<InstancesActionsButtonGroup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Please confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please confirm')).not.toBeInTheDocument(),
    );
  });

  it('removes the instance successfully and refreshes', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <InstancesActionsButtonGroup
        label="instance-1"
        server="testserver"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Remove Instance' }));

    await waitFor(() =>
      expect(screen.queryByText('Please confirm')).not.toBeInTheDocument(),
    );
    expect(axios.delete).toHaveBeenCalledWith('testserver/usage/instances', {
      params: { label: 'instance-1' },
    });
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows an error message and keeps the dialog open when removal fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));

    render(
      <InstancesActionsButtonGroup
        label="instance-1"
        server="testserver"
        setRefresh={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Remove Instance' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems deleting instance. Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText('Please confirm')).toBeInTheDocument();
  });
});
