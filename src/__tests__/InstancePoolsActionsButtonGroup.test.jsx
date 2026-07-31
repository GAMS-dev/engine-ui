import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import InstancePoolsActionsButtonGroup from '../components/InstancePoolsActionsButtonGroup';

vi.mock('axios');

describe('InstancePoolsActionsButtonGroup', () => {
  it('renders InstancePoolsActionsButtonGroup correctly', async () => {
    render(<InstancePoolsActionsButtonGroup />, {
      wrapper: AllProvidersWrapperDefault,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      screen.getByText(/Are you sure you want to remove the instance/),
    ).toBeInTheDocument();
  });

  it('shows "Shutting down..." and hides actions while a pool is canceling', () => {
    render(
      <InstancePoolsActionsButtonGroup
        isPool={true}
        poolIsCanceling={true}
        hasPoolWritePerm={true}
        instancePoolsEnabled={true}
        poolSize={2}
        poolSizeCurrent={2}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.getByText('Shutting down...')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change Size' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('shows a scaling up message when the pool is growing, independent of Delete', () => {
    render(
      <InstancePoolsActionsButtonGroup
        isPool={true}
        poolIsCanceling={false}
        hasPoolWritePerm={true}
        instancePoolsEnabled={true}
        poolSize={5}
        poolSizeCurrent={2}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.getByText(/Scaling up/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change Size' }),
    ).not.toBeInTheDocument();
    // Delete is independent of the scaling state.
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows a scaling down message when the pool is shrinking', () => {
    render(
      <InstancePoolsActionsButtonGroup
        isPool={true}
        poolIsCanceling={false}
        poolSize={1}
        poolSizeCurrent={5}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.getByText(/Scaling down/)).toBeInTheDocument();
  });

  it('does not show Change Size or Delete without write permission', () => {
    render(
      <InstancePoolsActionsButtonGroup
        isPool={true}
        poolIsCanceling={false}
        instancePoolsEnabled={true}
        hasPoolWritePerm={false}
        poolSize={2}
        poolSizeCurrent={2}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(
      screen.queryByRole('button', { name: 'Change Size' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('opens the Change Size dialog with the current size prefilled, then scales the pool successfully', async () => {
    axios.put.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <InstancePoolsActionsButtonGroup
          label="pool-1"
          server="testserver"
          isPool={true}
          poolIsCanceling={false}
          instancePoolsEnabled={true}
          hasPoolWritePerm={true}
          poolSize={2}
          poolSizeCurrent={2}
          setRefresh={setRefresh}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change Size' }));
    expect(screen.getByText('Update Instance Pool Size')).toBeInTheDocument();
    const input = screen.getByLabelText('New Size');
    expect(input.value).toEqual('2');

    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('testserver/usage/pools', {
        label: 'pool-1',
        size: '7',
      }),
    );
    expect(setAlertMsg).toHaveBeenCalledWith(
      'success:Instance Pool scaled successfully',
    );
    expect(setRefresh).toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.queryByText('Update Instance Pool Size'),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows scaling error messages, including the 403/404-specific one, and keeps the dialog open', async () => {
    axios.put.mockRejectedValueOnce(
      Object.assign(new Error('forbidden'), { response: { status: 404 } }),
    );

    render(
      <InstancePoolsActionsButtonGroup
        label="pool-1"
        server="testserver"
        isPool={true}
        poolIsCanceling={false}
        instancePoolsEnabled={true}
        hasPoolWritePerm={true}
        poolSize={2}
        poolSizeCurrent={2}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change Size' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems scaling instance pool. Error message: You are not allowed to scale this instance pool.',
        ),
      ).toBeInTheDocument(),
    );

    // The dialog stayed open on error, so a second, non-404 failure can be
    // exercised against the very same modal instance without another render.
    axios.put.mockRejectedValueOnce(
      Object.assign(new Error('Test error'), { response: { status: 500 } }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems scaling instance pool. Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('removes a plain instance (not a pool) using the instances endpoint', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <InstancePoolsActionsButtonGroup
        label="instance-1"
        server="testserver"
        isPool={false}
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Instance/ }));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('testserver/usage/instances', {
        params: { label: 'instance-1' },
      }),
    );
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows a generic error message when removing a plain instance fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));

    render(
      <InstancePoolsActionsButtonGroup
        label="instance-1"
        server="testserver"
        isPool={false}
        setRefresh={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Instance/ }));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems deleting instance . Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
  });

  it('removes an instance pool using the pools endpoint', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <InstancePoolsActionsButtonGroup
        label="pool-1"
        server="testserver"
        isPool={true}
        poolIsCanceling={false}
        hasPoolWritePerm={true}
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Instance Pool' }),
    );

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith('testserver/usage/pools', {
        params: { label: 'pool-1' },
      }),
    );
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows deletion error messages, including the 403/404-specific one, and keeps the dialog open', async () => {
    axios.delete.mockRejectedValueOnce(
      Object.assign(new Error('forbidden'), { response: { status: 404 } }),
    );

    render(
      <InstancePoolsActionsButtonGroup
        label="pool-1"
        server="testserver"
        isPool={true}
        poolIsCanceling={false}
        hasPoolWritePerm={true}
        setRefresh={vi.fn()}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Instance Pool' }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems deleting instance pool. Error message: You are not allowed to delete this instance pool.',
        ),
      ).toBeInTheDocument(),
    );

    // Same modal instance, second failure without the 404 special-case.
    axios.delete.mockRejectedValueOnce(
      Object.assign(new Error('Test error'), { response: { status: 500 } }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Instance Pool' }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          'Problems deleting instance pool. Error message: Test error',
        ),
      ).toBeInTheDocument(),
    );
  });
});
