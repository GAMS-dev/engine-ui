import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import JobReqInfoTable from '../components/JobReqInfoTable';
import axios from 'axios';

vi.mock('axios');

const baseJob = (overrides = {}) => ({
  access_groups: null,
  tag: null,
  token: 'token123',
  namespace: 'ns1',
  user: { username: 'user1', deleted: false },
  arguments: [],
  text_entries: [],
  stream_entries: [],
  is_temporary_model: false,
  model: 'model1',
  model_consistent: true,
  is_data_provided: false,
  stdout_filename: '',
  dep_tokens: [],
  ...overrides,
});

describe('JobReqInfoTable', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders JobReqInfoTable correctly', async () => {
    const jobInfo = {
      access_groups: null,
      tag: null,
      token: 'token123',
      user: { username: 'user1', delete: false },
      arguments: [],
      text_entries: [],
      stream_entries: [],
    };
    render(<JobReqInfoTable job={jobInfo} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Request/));
  });

  it('renders instance badge correctly', async () => {
    const jobInfo = {
      access_groups: null,
      tag: null,
      token: 'token123',
      user: { username: 'user1', delete: false },
      arguments: [],
      text_entries: [],
      stream_entries: [],
      labels: {
        cpu_request: 1,
        memory_request: 100,
        workspace_request: 100,
        tolerations: [],
        node_selectors: [],
        resource_warning: 'none',
        instance: 'asd123',
        multiplier: 1,
      },
    };
    render(<JobReqInfoTable job={jobInfo} inKubernetes={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('asd123'));
    expect(screen.getByText('1 vCPU, 100 MiB RAM, 1¢/s')).toBeInTheDocument();
  });

  it('does not show a Priority row when job.priority is null', async () => {
    render(<JobReqInfoTable job={baseJob()} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Data Provided'));
    expect(screen.queryByText('Priority')).not.toBeInTheDocument();
  });

  it('shows the capitalized Priority row when job.priority is set', async () => {
    render(<JobReqInfoTable job={baseJob({ priority: 'medium' })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const label = await waitFor(() => screen.findByText('Priority'));
    const row = label.closest('tr');
    expect(within(row).getByText('Medium')).toBeInTheDocument();
  });

  it('shows the HC badge and hides text/stream entries for hypercube jobs', async () => {
    render(<JobReqInfoTable job={baseJob()} isHcJob={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('HC'));
    expect(screen.queryByText('Text Entries')).not.toBeInTheDocument();
    expect(screen.queryByText('Stream Entries')).not.toBeInTheDocument();
  });

  it('renders access groups as links when present', async () => {
    render(
      <JobReqInfoTable
        job={baseJob({ access_groups: ['group1', 'group2'] })}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const link1 = await screen.findByText('group1');
    expect(link1).toHaveAttribute('href', '/groups/ns1/group1');
    const link2 = screen.getByText('group2');
    expect(link2).toHaveAttribute('href', '/groups/ns1/group2');
  });

  it('shows a Temporary badge for temporary models', async () => {
    render(<JobReqInfoTable job={baseJob({ is_temporary_model: true })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Temporary'));
    expect(
      screen.queryByText(/The arguments provided with the model/),
    ).not.toBeInTheDocument();
  });

  it('renders a DownloadLink when the model is consistent', async () => {
    render(
      <JobReqInfoTable
        job={baseJob({ is_temporary_model: false, model_consistent: true })}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const modelButton = await screen.findByText('model1');
    expect(modelButton.tagName).toBe('BUTTON');
    expect(
      screen.getByText(/The arguments provided with the model/),
    ).toBeInTheDocument();
  });

  it('shows a warning badge when the model is inconsistent', async () => {
    const user = userEvent.setup();
    render(
      <JobReqInfoTable
        job={baseJob({ is_temporary_model: false, model_consistent: false })}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await user.hover(await screen.findByText('model1'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'The model used for this job no longer exists or was updated after submission',
    );
  });

  it('shows Yes when data was provided', async () => {
    render(<JobReqInfoTable job={baseJob({ is_data_provided: true })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const label = await waitFor(() => screen.findByText('Data Provided'));
    const row = label.closest('tr');
    expect(within(row).getByText('Yes')).toBeInTheDocument();
  });

  it('renders arguments as badges when present', async () => {
    render(
      <JobReqInfoTable job={baseJob({ arguments: ['--arg1', '--arg2'] })} />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('--arg1'));
    expect(screen.getByText('--arg2')).toBeInTheDocument();
  });

  it('renders text and stream entries as badges when present', async () => {
    render(
      <JobReqInfoTable
        job={baseJob({
          text_entries: [{ entry_name: 'entry1' }],
          stream_entries: ['stream1'],
        })}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('entry1'));
    expect(screen.getByText('stream1')).toBeInTheDocument();
  });

  it('renders a resource warning badge when a resource warning is present', async () => {
    render(
      <JobReqInfoTable
        job={baseJob({
          labels: { resource_warning: 'disk_space' },
        })}
        inKubernetes={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('Out of disk space'));
  });

  it('renders tolerations, node selectors and unknown labels when there is no instance', async () => {
    const user = userEvent.setup();
    render(
      <JobReqInfoTable
        job={baseJob({
          labels: {
            tolerations: [{ key: 'a', value: 'b' }],
            node_selectors: [{ key: 'c', value: 'd' }],
            custom_label: 'hello',
          },
        })}
        inKubernetes={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const label = await screen.findByText('Resources');
    const row = label.closest('tr');
    await user.hover(within(row).getByText('a=b'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Toleration');
    await user.hover(within(row).getByText('c=d'));
    expect(await screen.findByText('Node Selector')).toBeInTheDocument();
    expect(within(row).getByText('hello')).toBeInTheDocument();
  });

  it('does not render the Resources row when not in kubernetes', async () => {
    render(
      <JobReqInfoTable
        job={baseJob({ labels: { resource_warning: 'disk_space' } })}
        inKubernetes={false}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('Request'));
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
  });

  it('does not render the Instance Sizing row when resource_stats is absent', async () => {
    render(<JobReqInfoTable job={baseJob()} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Request'));
    expect(screen.queryByText('Instance Sizing')).not.toBeInTheDocument();
  });

  it('renders sizing badges when resource_stats is present', async () => {
    render(
      <JobReqInfoTable
        job={baseJob({
          resource_stats: {
            cgroup_peak_memory_kilobytes: 600,
            cgroup_memory_limit_kilobytes: 1000,
            cgroup_cpu_usage_seconds: 80,
            cgroup_cpu_limit_millicores: 1000,
            cgroup_throttled_seconds: 0,
            wall_time_seconds: 100,
          },
        })}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    expect(await screen.findByText('Instance Sizing')).toBeInTheDocument();
    expect(screen.getByText('Memory: Well-sized')).toBeInTheDocument();
    expect(screen.getByText('CPU: Well-sized')).toBeInTheDocument();
  });

  it('renders job dependencies as links', async () => {
    render(<JobReqInfoTable job={baseJob({ dep_tokens: ['abc-123'] })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const depLink = await screen.findByText('abc');
    expect(depLink.closest('a')).toHaveAttribute('href', '/jobs/abc-123');
  });

  it('shows a dash when there are no job dependencies', async () => {
    render(<JobReqInfoTable job={baseJob({ dep_tokens: [] })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const label = await screen.findByText('Job Dependencies');
    const row = label.closest('tr');
    expect(within(row).getByText('-')).toBeInTheDocument();
  });

  it('updates the job tag when Enter is pressed', async () => {
    axios.put.mockResolvedValue({ status: 200 });
    render(<JobReqInfoTable job={baseJob({ tag: 'oldtag', token: 't1' })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const input = await screen.findByDisplayValue('oldtag');
    await user.clear(input);
    await user.type(input, 'newtag{Enter}');
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('testserver/jobs/t1/tag', {
        tag: 'newtag',
      }),
    );
  });

  it('uses the hypercube endpoint to update the job tag for HC jobs', async () => {
    axios.put.mockResolvedValue({ status: 200 });
    render(
      <JobReqInfoTable
        job={baseJob({ tag: 'oldtag', token: 't1' })}
        isHcJob={true}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    const input = await screen.findByDisplayValue('oldtag');
    await user.clear(input);
    await user.type(input, 'newtag{Enter}');
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('testserver/hypercube/t1/tag', {
        tag: 'newtag',
      }),
    );
  });

  it('resets the tag when Escape is pressed', async () => {
    render(<JobReqInfoTable job={baseJob({ tag: 'oldtag', token: 't1' })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const input = await screen.findByDisplayValue('oldtag');
    await user.type(input, 'newtag{Escape}');
    await waitFor(() => expect(input).toHaveValue('oldtag'));
    expect(axios.put).not.toHaveBeenCalled();
  });

  it('updates the job tag on blur', async () => {
    axios.put.mockResolvedValue({ status: 200 });
    render(<JobReqInfoTable job={baseJob({ tag: 'oldtag', token: 't1' })} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const input = await screen.findByDisplayValue('oldtag');
    await user.clear(input);
    await user.type(input, 'newtag');
    await user.tab();
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith('testserver/jobs/t1/tag', {
        tag: 'newtag',
      }),
    );
  });

  it('shows an alert if updating the job tag fails', async () => {
    axios.put.mockRejectedValue(new Error('boom'));
    const setAlertMsg = vi.fn();
    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <JobReqInfoTable job={baseJob({ tag: 'oldtag', token: 't1' })} />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );
    const input = await screen.findByDisplayValue('oldtag');
    await user.clear(input);
    await user.type(input, 'newtag{Enter}');
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems updating job tag. Error message: boom',
      ),
    );
  });

  it('opens and closes the edit access groups dialog', async () => {
    const { container } = render(<JobReqInfoTable job={baseJob()} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Access groups'));
    const editButton = container.querySelector('.btn.btn-sm.ms-1');
    await user.click(editButton);
    expect(screen.getByText('Change Access Groups')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Change Access Groups'),
      ).not.toBeInTheDocument(),
    );
  });

  it('updates access groups successfully and refreshes the job', async () => {
    axios.put.mockResolvedValue({ status: 200 });
    const setRefreshJob = vi.fn();
    const { container } = render(
      <JobReqInfoTable
        job={baseJob({ token: 't1' })}
        setRefreshJob={setRefreshJob}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('Access groups'));
    const editButton = container.querySelector('.btn.btn-sm.ms-1');
    await user.click(editButton);
    await user.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        'testserver/jobs/t1/access-groups',
        expect.any(FormData),
      ),
    );
    await waitFor(() => expect(setRefreshJob).toHaveBeenCalled());
  });

  it('shows an error message if updating access groups fails', async () => {
    axios.put.mockRejectedValue(new Error('access denied'));
    const { container } = render(
      <JobReqInfoTable job={baseJob({ token: 't1' })} />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('Access groups'));
    const editButton = container.querySelector('.btn.btn-sm.ms-1');
    await user.click(editButton);
    await user.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() =>
      screen.findByText(
        'Problems updating access groups. Error message: access denied',
      ),
    );
  });
});
