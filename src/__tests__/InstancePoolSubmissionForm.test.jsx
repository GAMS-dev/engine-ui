import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import InstancePoolSubmissionForm from '../components/InstancePoolSubmissionForm';

vi.mock('axios');

const routes = [{ path: '/pools', element: <p>navigated to pools</p> }];

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault options={{ routes: routes }}>
    {children}
  </AllProvidersWrapperDefault>
);

describe('InstancePoolSubmissionForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/pools/admin':
          return Promise.resolve({
            status: 200,
            data: {
              instance_pools_available: [],
            },
          });
        case 'testserver/usage/instances/admin':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: null,
              default_inherited_from: 'admin',
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
        case 'testserver/usage/instances/admin/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: {
                label: 'TestInstance',
                resource_type: 'instance',
              },
              default_inherited_from: 'admin',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders InstancePoolSubmissionForm correctly', async () => {
    render(<InstancePoolSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Pool Label/));
  });

  it('shows an error message when fetching instance data fails', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/pools/admin':
          return Promise.reject(new Error('pools service down'));
        case 'testserver/usage/instances/admin':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: null,
              default_inherited_from: 'admin',
              instances_available: [],
              default_instance: null,
            },
          });
        case 'testserver/usage/instances/admin/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: null,
              default_inherited_from: 'admin',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<InstancePoolSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() =>
      expect(
        screen.getByText(
          /An error occurred fetching instance pools\. Error message: pools service down\./i,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Pool Label/)).not.toBeInTheDocument();
  });

  it('shows an error instead of the form when no instances are available to create a pool with', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/usage/pools/admin':
          return Promise.resolve({
            status: 200,
            data: { instance_pools_available: [] },
          });
        case 'testserver/usage/instances/admin':
          return Promise.resolve({
            status: 200,
            data: {
              instances_inherited_from: null,
              default_inherited_from: 'admin',
              instances_available: [],
              default_instance: null,
            },
          });
        case 'testserver/usage/instances/admin/default':
          return Promise.resolve({
            status: 200,
            data: {
              default_instance: null,
              default_inherited_from: 'admin',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<InstancePoolSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() =>
      expect(
        screen.getByText(/No instances available to create a pool with/i),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText(/Pool Label/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Add Instance Pool/i }),
    ).not.toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('submits a new instance pool with the selected instance, label and size', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <InstancePoolSubmissionForm />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapper },
    );
    await waitFor(() => screen.findByText(/Pool Label/));

    await user.type(screen.getByLabelText(/Pool Label/i), 'new-pool');

    await selectEvent.select(
      screen.getByLabelText('Instance'),
      'TestInstance (3 vCPU, 100 MiB RAM, 3¢/s)',
    );

    const sizeInput = screen.getByLabelText(/^Size$/i);
    await user.clear(sizeInput);
    await user.type(sizeInput, '4');

    await user.click(
      screen.getByRole('button', { name: /Add Instance Pool/i }),
    );

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith('testserver/usage/pools', {
      label: 'new-pool',
      instance: 'TestInstance',
      size: '4',
    });
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'success:Instance Pool added successfully',
      ),
    );
    await waitFor(() =>
      expect(screen.getByText('navigated to pools')).toBeInTheDocument(),
    );
  });

  it('shows structured field errors returned by the API', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: {
          errors: {
            label: 'already taken',
            instance: 'invalid instance',
            size: 'must be positive',
          },
        },
      },
    });

    render(<InstancePoolSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Pool Label/));

    await user.type(screen.getByLabelText(/Pool Label/i), 'new-pool');

    await user.click(
      screen.getByRole('button', { name: /Add Instance Pool/i }),
    );

    await waitFor(() =>
      expect(screen.getByText('already taken')).toBeInTheDocument(),
    );
    expect(screen.getByText('invalid instance')).toBeInTheDocument();
    expect(screen.getByText('must be positive')).toBeInTheDocument();
    expect(
      screen.getByText(/Problems adding instance pool\./i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Pool Label/i).className).toContain(
      'is-invalid',
    );
    expect(screen.getByLabelText(/^Size$/i).className).toContain('is-invalid');
  });

  it('shows a generic error message for unstructured API failures', async () => {
    axios.post.mockRejectedValue(new Error('network down'));

    render(<InstancePoolSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Pool Label/));

    await user.type(screen.getByLabelText(/Pool Label/i), 'new-pool');

    await user.click(
      screen.getByRole('button', { name: /Add Instance Pool/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText(
          /Problems adding instance pool\. Error message: network down/i,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Pool Label/i).className).not.toContain(
      'is-invalid',
    );
  });
});
