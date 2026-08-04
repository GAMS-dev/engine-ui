import { render, waitFor, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import selectEvent from 'react-select-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import DefaultInstanceSelector from '../components/DefaultInstanceSelector';
import axios from 'axios';
import AlertContext from '../contexts/AlertContext';

vi.mock('axios');

const testInstance = {
  label: 'TestInstance',
  cpu_request: 3,
  memory_request: 100,
  workspace_request: 100,
  node_selectors: [],
  tolerations: [],
  multiplier: 3,
  multiplier_idle: 3,
};

const test2Instance = {
  label: 'Test2',
  cpu_request: 2,
  memory_request: 100,
  workspace_request: 100,
  node_selectors: [],
  tolerations: [],
  multiplier: 6,
  multiplier_idle: 6,
};

const buildAxiosGetMock =
  ({
    instances = [testInstance, test2Instance],
    pools = [],
    defaultInstance = testInstance,
    defaultInheritedFrom = 'admin',
  } = {}) =>
  (url) => {
    switch (url) {
      case 'testserver/usage/pools/admin':
        return Promise.resolve({
          status: 200,
          data: {
            instance_pools_available: pools,
          },
        });
      case 'testserver/usage/instances/admin':
        return Promise.resolve({
          status: 200,
          data: {
            instances_inherited_from: null,
            default_inherited_from: defaultInheritedFrom,
            instances_available: instances,
            default_instance: defaultInstance,
          },
        });
      case 'testserver/usage/instances/admin/default':
        return Promise.resolve({
          status: 200,
          data: {
            default_instance: defaultInstance,
            default_inherited_from: defaultInheritedFrom,
          },
        });
      default:
        return Promise.reject(new Error('not found'));
    }
  };

let alertMsgMock;
const AlertWrapper = ({ children }) => (
  <AllProvidersWrapperDefault>
    <AlertContext.Provider value={['', alertMsgMock]}>
      {children}
    </AlertContext.Provider>
  </AllProvidersWrapperDefault>
);

describe('DefaultInstanceSelector', () => {
  beforeEach(() => {
    alertMsgMock = vi.fn();
    axios.get.mockImplementation(buildAxiosGetMock());
  });

  it('renders DefaultInstanceSelector correctly', async () => {
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Default instance'));
  });

  it('hides the missing-default warning and preselects the current default when one is assigned', async () => {
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Default instance'));

    expect(
      screen.getByText('You do not currently have a default instance assigned'),
    ).toHaveStyle({ display: 'none' });
    expect(
      await screen.findByText('TestInstance (3 vCPU, 100 MiB RAM, 3¢/s)'),
    ).toBeInTheDocument();
  });

  it('shows a warning and defaults to the first available instance when no default is assigned', async () => {
    axios.get.mockImplementation(buildAxiosGetMock({ defaultInstance: null }));
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Default instance'));

    expect(
      screen.getByText('You do not currently have a default instance assigned'),
    ).toHaveStyle({ display: 'block' });

    // Instances are sorted alphabetically by label, so "Test2" sorts before
    // "TestInstance" and becomes the first entry used as the fallback value.
    await waitFor(() => screen.findByText(/Test2 \(2 vCPU/));
  });

  it('renders nothing when there are no available instances or pools', async () => {
    axios.get.mockImplementation(
      buildAxiosGetMock({ instances: [], pools: [], defaultInstance: null }),
    );
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('testserver/usage/pools/admin'),
    );
    await waitFor(() =>
      expect(screen.queryByText('Default instance')).not.toBeInTheDocument(),
    );
  });

  it('updates the default instance and calls the API when a different instance is selected', async () => {
    axios.put.mockResolvedValue({});
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Default instance'));
    await screen.findByText(/TestInstance \(3 vCPU/);

    await act(async () => {
      await selectEvent.select(
        screen.getByLabelText('Default instance'),
        'Test2 (2 vCPU, 100 MiB RAM, 6¢/s)',
      );
    });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Test2 \(2 vCPU/)).toBeInTheDocument();
    });
    expect(axios.put).toHaveBeenCalledWith(
      'testserver/usage/instances/admin/default',
      { default_label: 'Test2' },
    );
    expect(alertMsgMock).not.toHaveBeenCalled();
  });

  it('does not call the API when selecting the currently assigned default instance', async () => {
    axios.put.mockResolvedValue({});
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Default instance'));
    await screen.findByText(/TestInstance \(3 vCPU/);

    await selectEvent.select(
      screen.getByLabelText('Default instance'),
      'TestInstance (3 vCPU, 100 MiB RAM, 3¢/s)',
    );

    expect(axios.put).not.toHaveBeenCalled();
  });

  it('shows an alert with the server error message when updating the default instance fails', async () => {
    axios.put.mockRejectedValue({ message: 'boom' });
    render(<DefaultInstanceSelector className={'form-group mt-3 mb-3'} />, {
      wrapper: AlertWrapper,
    });
    await waitFor(() => screen.findByText('Default instance'));
    await screen.findByText(/TestInstance \(3 vCPU/);

    await act(async () => {
      await selectEvent.select(
        screen.getByLabelText('Default instance'),
        'Test2 (2 vCPU, 100 MiB RAM, 6¢/s)',
      );
    });

    await waitFor(() => {
      expect(alertMsgMock).toHaveBeenCalledWith(
        'Some error occurred while trying to update default instance. Error message: boom.',
      );
      // The optimistic value is not applied when the request fails.
      expect(screen.getByText(/TestInstance \(3 vCPU/)).toBeInTheDocument();
    });
  });
});
