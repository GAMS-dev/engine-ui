import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import InstanceSubmissionForm from '../components/InstanceSubmissionForm';
import AlertContext from '../contexts/AlertContext';
import axios from 'axios';

vi.mock('axios');

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router';

describe('InstanceSubmissionForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.mocked(useParams).mockReturnValue({ label: undefined });
  });

  it('renders InstanceSubmissionForm correctly', async () => {
    render(<InstanceSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Instance Label/));
  });

  it('does not call the instances API in add mode', async () => {
    render(<InstanceSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add new Instance/i));
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('toggles the GAMS license textarea visibility', async () => {
    render(<InstanceSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Instance Label/));

    expect(screen.queryByLabelText(/^GAMS License$/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByLabelText(/Attach GAMS license to the instance/i),
    );
    expect(screen.getByLabelText(/^GAMS License$/i)).toBeInTheDocument();
    await user.click(
      screen.getByLabelText(/Attach GAMS license to the instance/i),
    );
    expect(screen.queryByLabelText(/^GAMS License$/i)).not.toBeInTheDocument();
  });

  it('submits a new instance with only the required fields', async () => {
    axios.mockResolvedValue({ data: {} });
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <InstanceSubmissionForm />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText(/Add new Instance/i));

    await user.type(screen.getByLabelText(/Instance Label/i), 'new-instance');
    await user.type(screen.getByLabelText(/^CPU/i), '2');
    await user.type(screen.getByLabelText(/^Memory/i), '512');
    await user.type(screen.getByLabelText(/Workspace Size/i), '256');
    await user.type(screen.getByLabelText(/^Multiplier/i), '1');
    await user.type(screen.getByLabelText(/Idle Multiplier/i), '0.5');

    await user.click(screen.getByRole('button', { name: /Add Instance/i }));

    await waitFor(() => expect(axios).toHaveBeenCalled());
    const call = axios.mock.calls[0][0];
    expect(call.method).toBe('post');
    expect(call.url).toBe('testserver/usage/instances');
    expect(call.data.old_label).toBeUndefined();
    expect(call.data.tolerations).toBeUndefined();
    expect(call.data.node_selectors).toBeUndefined();
    expect(call.data.gams_license).toBeUndefined();
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'success:Instance added successfully',
      ),
    );
  });

  it('submits tolerations, node selectors and a base64-encoded GAMS license', async () => {
    axios.mockResolvedValue({ data: {} });

    render(<InstanceSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add new Instance/i));

    await user.type(screen.getByLabelText(/Instance Label/i), 'new-instance');
    await user.type(screen.getByLabelText(/^CPU/i), '2');
    await user.type(screen.getByLabelText(/^Memory/i), '512');
    await user.type(screen.getByLabelText(/Workspace Size/i), '256');
    await user.type(screen.getByLabelText(/^Multiplier/i), '1');
    await user.type(screen.getByLabelText(/Idle Multiplier/i), '0.5');
    await user.type(screen.getByLabelText(/Tolerations/i), 'a=1,b=2');
    await user.type(screen.getByLabelText(/Node Selectors/i), 'c=3');
    await user.click(
      screen.getByLabelText(/Attach GAMS license to the instance/i),
    );
    await user.type(
      screen.getByLabelText(/^GAMS License$/i),
      '  LICENSE-TEXT  ',
    );

    await user.click(screen.getByRole('button', { name: /Add Instance/i }));

    await waitFor(() => expect(axios).toHaveBeenCalled());
    const payload = axios.mock.calls[0][0].data;
    expect(payload.tolerations).toEqual(['a=1', 'b=2']);
    expect(payload.node_selectors).toEqual(['c=3']);
    expect(payload.gams_license).toBe(window.btoa('LICENSE-TEXT'));
  });

  it('shows structured field errors returned by the API', async () => {
    axios.mockRejectedValue({
      response: {
        data: {
          errors: {
            label: 'already taken',
            cpu_request: 'too low',
          },
        },
      },
    });

    render(<InstanceSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add new Instance/i));

    await user.type(screen.getByLabelText(/Instance Label/i), 'new-instance');
    await user.type(screen.getByLabelText(/^CPU/i), '2');
    await user.type(screen.getByLabelText(/^Memory/i), '512');
    await user.type(screen.getByLabelText(/Workspace Size/i), '256');
    await user.type(screen.getByLabelText(/^Multiplier/i), '1');
    await user.type(screen.getByLabelText(/Idle Multiplier/i), '0.5');

    await user.click(screen.getByRole('button', { name: /Add Instance/i }));

    await waitFor(() =>
      expect(screen.getByText('already taken')).toBeInTheDocument(),
    );
    expect(screen.getByText('too low')).toBeInTheDocument();
    expect(screen.getByText(/Problems adding instance\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instance Label/i).className).toContain(
      'is-invalid',
    );
    expect(screen.getByLabelText(/^CPU/i).className).toContain('is-invalid');
  });

  it('shows a generic error message for unstructured API failures', async () => {
    axios.mockRejectedValue(new Error('network down'));

    render(<InstanceSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add new Instance/i));

    await user.type(screen.getByLabelText(/Instance Label/i), 'new-instance');
    await user.type(screen.getByLabelText(/^CPU/i), '2');
    await user.type(screen.getByLabelText(/^Memory/i), '512');
    await user.type(screen.getByLabelText(/Workspace Size/i), '256');
    await user.type(screen.getByLabelText(/^Multiplier/i), '1');
    await user.type(screen.getByLabelText(/Idle Multiplier/i), '0.5');

    await user.click(screen.getByRole('button', { name: /Add Instance/i }));

    await waitFor(() =>
      expect(
        screen.getByText(
          /Problems adding instance\. Error message: network down/i,
        ),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Instance Label/i).className).not.toContain(
      'is-invalid',
    );
  });

  describe('edit mode', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({ label: 'instance1' });
    });

    it('populates fields from the matching non-pool instance', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: [
          {
            label: 'instance1',
            is_pool: false,
            cpu_request: 4,
            memory_request: 1024,
            workspace_request: 2048,
            multiplier: 2,
            multiplier_idle: 1,
            tolerations: [{ key: 'k1', value: 'v1' }],
            node_selectors: [{ key: 'n1', value: 'v1' }],
            gams_license: '  SOME-LICENSE-TEXT  ',
          },
        ],
      });

      render(<InstanceSubmissionForm />, {
        wrapper: AllProvidersWrapperDefault,
      });
      await waitFor(() => screen.findByText(/Update Instance: 'instance1'/i));

      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1024')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2048')).toBeInTheDocument();
      expect(screen.getByDisplayValue('k1=v1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('n1=v1')).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Attach GAMS license to the instance/i),
      ).toBeChecked();
      expect(screen.getByLabelText(/^GAMS License$/i)).toHaveValue(
        'SOME-LICENSE-TEXT',
      );
    });

    it('does not check the license box when gams_license is empty', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: [
          {
            label: 'instance1',
            is_pool: false,
            cpu_request: 4,
            memory_request: 1024,
            workspace_request: 2048,
            multiplier: 2,
            multiplier_idle: 1,
            tolerations: [],
            node_selectors: [],
            gams_license: '',
          },
        ],
      });

      render(<InstanceSubmissionForm />, {
        wrapper: AllProvidersWrapperDefault,
      });
      await waitFor(() => screen.findByText(/Update Instance: 'instance1'/i));

      expect(
        screen.getByLabelText(/Attach GAMS license to the instance/i),
      ).not.toBeChecked();
      expect(
        screen.queryByLabelText(/^GAMS License$/i),
      ).not.toBeInTheDocument();
    });

    it('shows a not-found error when no non-pool instance matches the label', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: [
          {
            label: 'instance1',
            is_pool: true,
            cpu_request: 4,
            memory_request: 1024,
            workspace_request: 2048,
            multiplier: 2,
            multiplier_idle: 1,
            tolerations: [],
            node_selectors: [],
          },
        ],
      });

      render(<InstanceSubmissionForm />, {
        wrapper: AllProvidersWrapperDefault,
      });
      await waitFor(() =>
        expect(
          screen.getByText(/Instance: instance1 does not exist/i),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByText(/Instance Label/i)).not.toBeInTheDocument();
    });

    it('shows an error when fetching instances fails', async () => {
      axios.get.mockRejectedValue(new Error('instances service down'));

      render(<InstanceSubmissionForm />, {
        wrapper: AllProvidersWrapperDefault,
      });
      await waitFor(() =>
        expect(
          screen.getByText(/Problems while while retrieving instance data/i),
        ).toBeInTheDocument(),
      );
    });

    it('submits an update with the old_label included and a put request', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: [
          {
            label: 'instance1',
            is_pool: false,
            cpu_request: 4,
            memory_request: 1024,
            workspace_request: 2048,
            multiplier: 2,
            multiplier_idle: 1,
            tolerations: [],
            node_selectors: [],
            gams_license: '',
          },
        ],
      });
      axios.mockResolvedValue({ data: {} });
      const setAlertMsg = vi.fn();

      render(
        <AlertContext.Provider value={['', setAlertMsg]}>
          <InstanceSubmissionForm />
        </AlertContext.Provider>,
        { wrapper: AllProvidersWrapperDefault },
      );
      await waitFor(() => screen.findByText(/Update Instance: 'instance1'/i));

      await user.click(
        screen.getByRole('button', { name: /Update Instance/i }),
      );

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const call = axios.mock.calls[0][0];
      expect(call.method).toBe('put');
      expect(call.data.old_label).toBe('instance1');
      await waitFor(() =>
        expect(setAlertMsg).toHaveBeenCalledWith(
          'success:Instance updated successfully',
        ),
      );
    });
  });
});
