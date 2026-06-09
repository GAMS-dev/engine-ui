import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import JobReqInfoTable from '../components/JobReqInfoTable';

vi.mock('axios');

describe('JobReqInfoTable', () => {
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
    await waitFor(() =>
      screen.findByText('asd123 (1 vCPU, 100 MiB RAM, 1¢/s)'),
    );
  });
});
