import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import JobSubmissionForm from '../components/JobSubmissionForm';
import AlertContext from '../contexts/AlertContext';
import axios from 'axios';

vi.mock('axios');

// Mock FileDropZone to render a simple file input so we can easily test file uploads.
// `multiple` defaults to true (unless explicitly false, as for the hypercube file drop
// zone) so tests can exercise multi-file uploads for the model/data drop zones.
vi.mock('../components/FileDropZone', () => ({
  __esModule: true,
  default: ({ onDrop, label, multiple }) => (
    <div>
      <label htmlFor={`mock-dropzone-${label}`}>{label}</label>
      <input
        id={`mock-dropzone-${label}`}
        type="file"
        multiple={multiple !== false}
        onChange={(e) => onDrop(Array.from(e.target.files))}
      />
    </div>
  ),
}));

describe('JobSubmissionForm', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/namespaces/':
          return Promise.resolve({
            status: 200,
            data: [
              {
                name: 'test_namespace',
                permissions: [
                  {
                    username: 'admin',
                    permission: 7,
                  },
                ],
                disk_quota: null,
              },
            ],
          });
        case 'testserver/usage/quota':
          return Promise.resolve({ status: 200, data: [] });
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
              instances_available: [
                {
                  label: 'test',
                  cpu_request: 1,
                  memory_request: 100,
                  workspace_request: 100,
                  node_selectors: [],
                  tolerations: [],
                  multiplier: 1,
                  multiplier_idle: 1,
                },
              ],
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
        case 'testserver/namespaces/test_namespace':
          return Promise.resolve({
            status: 200,
            data: [{ name: 'my_registered_model.zip' }],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders JobSubmissionForm correctly', async () => {
    render(<JobSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Use raw resource requests?/));
  });

  it('uses v1/jobs/ endpoint when use_brokerv2 is false', async () => {
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Submit Job/));

    // Use the registered model to bypass the need to upload a model file
    const useRegisteredCheckbox = screen.getByLabelText(
      /Use a Registered Model\?/i,
    );
    await user.click(useRegisteredCheckbox);

    const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'testserver/jobs/',
        expect.any(FormData),
        expect.any(Object),
      );
    });
  });

  it('uses the /v2/jobs/ endpoint when use_brokerv2 is true', async () => {
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{ is_saas: true, use_brokerv2: true }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText(/Submit Job/));

    const useRegisteredCheckbox = screen.getByLabelText(
      /Use a Registered Model\?/i,
    );
    await user.click(useRegisteredCheckbox);

    const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'testserver/v2/jobs/',
        expect.any(FormData),
        expect.any(Object),
      );
    });
  });

  it('uses the /hypercube/ endpoint when newHcJob is true', async () => {
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm newHcJob={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Submit Job/));

    const useRegisteredCheckbox = screen.getByLabelText(
      /Use a Registered Model\?/i,
    );
    await user.click(useRegisteredCheckbox);

    // Hypercube jobs strictly require an hc.json file to be uploaded before submission
    const hcInput = screen.getByLabelText(
      /Drop Hypercube description file here/i,
    );
    const hcFile = new File(['{"hypercube": true}'], 'hc.json', {
      type: 'application/json',
    });
    await user.upload(hcInput, hcFile);

    const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'testserver/hypercube/',
        expect.any(FormData),
        expect.any(Object),
      );
    });
  });

  const defaultGetHandlers = {
    'testserver/namespaces/': () =>
      Promise.resolve({
        status: 200,
        data: [
          {
            name: 'test_namespace',
            permissions: [{ username: 'admin', permission: 7 }],
          },
        ],
      }),
    'testserver/usage/quota': () => Promise.resolve({ status: 200, data: [] }),
    'testserver/usage/pools/admin': () =>
      Promise.resolve({ status: 200, data: { instance_pools_available: [] } }),
    'testserver/usage/instances/admin': () =>
      Promise.resolve({
        status: 200,
        data: {
          instances_inherited_from: null,
          instances_available: [
            {
              label: 'test',
              cpu_request: 1,
              memory_request: 100,
              workspace_request: 100,
              node_selectors: [],
              tolerations: [],
              multiplier: 1,
              multiplier_idle: 1,
            },
          ],
        },
      }),
    'testserver/usage/instances/admin/default': () =>
      Promise.resolve({
        status: 200,
        data: { default_instance: null, default_inherited_from: null },
      }),
    'testserver/namespaces/test_namespace': () =>
      Promise.resolve({
        status: 200,
        data: [{ name: 'my_registered_model.zip' }],
      }),
  };

  const mockAxiosGet = (overrides = {}) => {
    const handlers = { ...defaultGetHandlers, ...overrides };
    axios.get.mockImplementation((url) => {
      const handler = handlers[url];
      return handler ? handler() : Promise.reject(new Error('not found'));
    });
  };

  it('shows an error when the user has no execute access to any namespace', async () => {
    mockAxiosGet({
      'testserver/namespaces/': () =>
        Promise.resolve({
          status: 200,
          data: [
            {
              name: 'test_namespace',
              permissions: [{ username: 'someoneelse', permission: 7 }],
            },
          ],
        }),
    });

    render(<JobSubmissionForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ roles: ['user'] }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() =>
      expect(
        screen.getByText(/You have no execute access to any namespace/i),
      ).toBeInTheDocument(),
    );
  });

  it('stops loading and shows an error when the namespaces request fails', async () => {
    mockAxiosGet({
      'testserver/namespaces/': () =>
        Promise.reject(new Error('network error')),
    });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() =>
      expect(
        screen.getByText(/An error occurred while retrieving namespaces/i),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Submit Job/i)).not.toBeInTheDocument();
  });

  it('shows an error message when the quota request fails', async () => {
    mockAxiosGet({
      'testserver/usage/quota': () =>
        Promise.reject(new Error('quota service down')),
    });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() =>
      expect(
        screen.getByText(/Problems fetching quota data/i),
      ).toBeInTheDocument(),
    );
  });

  it('stops loading and shows an error, but still allows submission, when fetching registered models fails', async () => {
    mockAxiosGet({
      'testserver/namespaces/test_namespace': () =>
        Promise.reject(new Error('models service down')),
    });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() =>
      expect(
        screen.getByText(/Problems while retrieving registered models/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Submit Job/i)).toBeInTheDocument();
  });

  it('disables the registered-model checkbox when none are available', async () => {
    mockAxiosGet({
      'testserver/namespaces/test_namespace': () =>
        Promise.resolve({ status: 200, data: [] }),
    });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    expect(screen.getByLabelText(/Use a Registered Model\?/i)).toBeDisabled();
  });

  it('shows an error when no instances are assigned and raw requests are not allowed', async () => {
    mockAxiosGet({
      'testserver/usage/instances/admin': () =>
        Promise.resolve({
          status: 200,
          data: {
            instances_inherited_from: 'someoneelse',
            instances_available: [],
          },
        }),
    });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() =>
      expect(
        screen.getByText(/no instances assigned to you/i),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Submit Job/i)).not.toBeInTheDocument();
  });

  it('auto-enables raw resource requests when no instances are available but raw requests are allowed', async () => {
    mockAxiosGet({
      'testserver/usage/instances/admin': () =>
        Promise.resolve({
          status: 200,
          data: { instances_inherited_from: null, instances_available: [] },
        }),
    });
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    expect(
      screen.queryByLabelText(/Use raw resource requests\?/i),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Required CPU Units/i), '2');
    await user.type(screen.getByLabelText(/Required Memory Units/i), '512');
    await user.type(screen.getByLabelText(/Required Workspace Size/i), '256');

    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.getAll('labels')).toEqual(
      expect.arrayContaining([
        'cpu_request=2',
        'memory_request=512',
        'workspace_request=256',
      ]),
    );
  });

  it('resets the CPU request field to a valid empty state when cleared', async () => {
    mockAxiosGet();

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    await user.click(screen.getByLabelText(/Use raw resource requests\?/i));

    const cpuInput = screen.getByLabelText(/Required CPU Units/i);
    await user.type(cpuInput, '2');
    expect(cpuInput.className).not.toContain('is-invalid');

    await user.clear(cpuInput);
    expect(cpuInput).toHaveValue(null);
    expect(cpuInput.className).not.toContain('is-invalid');
  });

  it('hides kubernetes-specific fields when not running in kubernetes', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ in_kubernetes: false }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText(/Submit Job/));
    expect(
      screen.queryByLabelText(/Use raw resource requests\?/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.getAll('labels')).toEqual([]);
  });

  it('shows and submits the priority selector when priorities are enabled', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{
            in_kubernetes: false,
            serverConfig: { job_priorities_access: 'ENABLED' },
          }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByRole('button', { name: /Advanced Options/i }));
    expect(screen.getByText(/^Priority$/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('priority')).toBe('medium');
  });

  it('submits an uploaded non-zip model file, deriving and slicing the .gms model name', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    const modelInput = screen.getByLabelText(/Drop static model files here/i);
    const modelFile = new File(['* dummy'], 'mymodel.txt', {
      type: 'text/plain',
    });
    await user.upload(modelInput, modelFile);
    expect(screen.getByLabelText(/Name of the Main File/i)).toHaveValue(
      'mymodel.gms',
    );

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('model')).toBe('mymodel');
    expect(formData.get('run')).toBeNull();
    expect(formData.get('model_data')).toBeTruthy();
  });

  it('appends a run argument when the model name does not end in .gms', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    const modelInput = screen.getByLabelText(/Drop static model files here/i);
    const modelFile = new File(['* dummy'], 'mymodel.txt', {
      type: 'text/plain',
    });
    await user.upload(modelInput, modelFile);

    const nameInput = screen.getByLabelText(/Name of the Main File/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'customname');

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('model')).toBe('customname');
    expect(formData.get('run')).toBe('customname');
  });

  it('skips zipping a single already-zipped model file', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    const modelInput = screen.getByLabelText(/Drop static model files here/i);
    const zipContent = 'a'.repeat(100);
    const modelFile = new File([zipContent], 'model.zip', {
      type: 'application/zip',
    });
    await user.upload(modelInput, modelFile);

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    const submittedModelData = formData.get('model_data');
    expect(submittedModelData.size).toBe(modelFile.size);
  });

  it('appends an optional data file to the submission', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    const dataInput = screen.getByLabelText(
      /Drop data files here \(optional\)/i,
    );
    const dataFile = new File(['data'.repeat(10)], 'data.zip', {
      type: 'application/zip',
    });
    await user.upload(dataInput, dataFile);

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('data')).toBeTruthy();
  });

  it('shows an error when submitting a hypercube job without an hc file', async () => {
    mockAxiosGet();

    render(<JobSubmissionForm newHcJob={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Hypercube description file must be provided/i),
      ).toBeInTheDocument(),
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('shows an error when the uploaded hc file is not a JSON file', async () => {
    mockAxiosGet();

    render(<JobSubmissionForm newHcJob={true} />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    const hcInput = screen.getByLabelText(
      /Drop Hypercube description file here/i,
    );
    const hcFile = new File(['not json'], 'hc.txt', { type: 'text/plain' });
    await user.upload(hcInput, hcFile);

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Hypercube description must be a JSON file/i),
      ).toBeInTheDocument(),
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('shows an error when no model files are provided and no registered model is used', async () => {
    mockAxiosGet();

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    await user.type(
      screen.getByLabelText(/Name of the Main File/i),
      'mymodel.gms',
    );
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Please provide model files\./i),
      ).toBeInTheDocument(),
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('appends advanced option fields to the submission', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    await user.type(screen.getByPlaceholderText(/Job tag/i), 'my-tag');
    await user.click(screen.getByRole('button', { name: /Advanced Options/i }));
    await user.type(
      screen.getByPlaceholderText(/Command line arguments/i),
      'a,b,c',
    );
    await user.type(
      screen.getByPlaceholderText(/^Log file name/i),
      'custom_log.txt',
    );
    await user.type(
      screen.getByPlaceholderText(/^Text entries/i),
      'text1,text2',
    );
    await user.type(screen.getByPlaceholderText(/^Stream entries/i), 'stream1');
    await user.type(screen.getByPlaceholderText(/Job dependencies/i), 'dep1');

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('tag')).toBe('my-tag');
    expect(formData.get('stdout_filename')).toBe('custom_log.txt');
    expect(formData.getAll('arguments')).toEqual(['a', 'b', 'c']);
    expect(formData.getAll('dep_tokens')).toEqual(['dep1']);
    expect(formData.getAll('text_entries')).toEqual(['text1', 'text2']);
    expect(formData.getAll('stream_entries')).toEqual(['stream1']);
  });

  it('sets the success alert message on a normal successful submission', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <JobSubmissionForm />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'success:Job successfully submitted!',
      ),
    );
  });

  it('shows an error message when job submission fails', async () => {
    mockAxiosGet();
    axios.post.mockRejectedValue(new Error('boom'));

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Problems posting job\. Error message: boom\./i),
      ).toBeInTheDocument(),
    );
  });

  it('shows an error and stops loading instances when fetching instance data fails', async () => {
    mockAxiosGet({
      'testserver/usage/pools/admin': () =>
        Promise.reject(new Error('instance service down')),
    });

    const { container } = render(<JobSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() =>
      expect(
        screen.getByText(/An error occurred fetching instances/i),
      ).toBeInTheDocument(),
    );
    // The instances-loading spinner (ClipLoader) must stop, not spin forever.
    expect(
      container.querySelector('#labelsWrapperContent > span'),
    ).not.toBeInTheDocument();
    // The main form still renders (isLoading is a separate flag from instancesLoaded).
    expect(screen.getByText(/Submit Job/i)).toBeInTheDocument();
  });

  it('resets the memory and workspace request fields to a valid empty state when cleared', async () => {
    mockAxiosGet();

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use raw resource requests\?/i));

    const memInput = screen.getByLabelText(/Required Memory Units/i);
    await user.type(memInput, '512');
    expect(memInput.className).not.toContain('is-invalid');
    await user.clear(memInput);
    expect(memInput).toHaveValue(null);
    expect(memInput.className).not.toContain('is-invalid');

    const wsInput = screen.getByLabelText(/Required Workspace Size/i);
    await user.type(wsInput, '256');
    expect(wsInput.className).not.toContain('is-invalid');
    await user.clear(wsInput);
    expect(wsInput).toHaveValue(null);
    expect(wsInput.className).not.toContain('is-invalid');
  });

  it('appends toleration and node selector labels when using raw resource requests', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use raw resource requests\?/i));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    await user.type(screen.getByLabelText(/Tolerations/i), 't1,t2');
    await user.type(screen.getByLabelText(/Node Selectors/i), 'n1,n2');

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.getAll('labels')).toEqual(
      expect.arrayContaining([
        'tolerations=t1',
        'tolerations=t2',
        'node_selectors=n1',
        'node_selectors=n2',
      ]),
    );
  });

  it('zips a non-zip data file before submitting', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    const dataInput = screen.getByLabelText(
      /Drop data files here \(optional\)/i,
    );
    const dataFile = new File(['data content'], 'data.txt', {
      type: 'text/plain',
    });
    await user.upload(dataInput, dataFile);

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    const submittedData = formData.get('data');
    expect(submittedData).toBeTruthy();
    expect(submittedData.name).toBe('data.zip');
  });

  it('shows an error and stops submitting when data zipping fails because too many files were provided', async () => {
    mockAxiosGet();

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    const dataInput = screen.getByLabelText(
      /Drop data files here \(optional\)/i,
    );
    const tooManyFiles = Array.from(
      { length: 201 },
      (_, i) => new File(['x'], `f${i}.txt`, { type: 'text/plain' }),
    );
    await user.upload(dataInput, tooManyFiles);

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Problems posting job as data could not be zipped/i),
      ).toBeInTheDocument(),
    );
    expect(axios.post).not.toHaveBeenCalled();
    // isSubmitting was reset back to false, so the submit button is re-enabled.
    expect(screen.getByRole('button', { name: /Submit Job/i })).toBeEnabled();
  });

  it('includes selected access groups in the submission', async () => {
    mockAxiosGet({
      'testserver/namespaces/test_namespace/user-groups': () =>
        Promise.resolve({
          status: 200,
          data: [{ label: 'group1' }, { label: 'group2' }],
        }),
    });
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Advanced Options/i }));

    await waitFor(() =>
      expect(
        screen.getByLabelText(/Select access groups/i),
      ).toBeInTheDocument(),
    );
    await selectEvent.select(
      screen.getByLabelText(/Select access groups/i),
      'group1',
    );

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.getAll('access_groups')).toEqual(['group1']);
  });

  it('includes the inex_string field when result filtering is enabled', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));
    await user.click(screen.getByRole('button', { name: /Advanced Options/i }));

    await user.click(screen.getByLabelText(/Filter results/i));

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('inex_string')).toContain('include');
  });

  it('selects a different instance and includes it in the submitted labels', async () => {
    mockAxiosGet({
      'testserver/usage/instances/admin': () =>
        Promise.resolve({
          status: 200,
          data: {
            instances_inherited_from: null,
            instances_available: [
              {
                label: 'test',
                cpu_request: 1,
                memory_request: 100,
                workspace_request: 100,
                node_selectors: [],
                tolerations: [],
                multiplier: 1,
                multiplier_idle: 1,
              },
              {
                label: 'test2',
                cpu_request: 2,
                memory_request: 200,
                workspace_request: 200,
                node_selectors: [],
                tolerations: [],
                multiplier: 2,
                multiplier_idle: 2,
              },
            ],
          },
        }),
    });
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    await selectEvent.select(
      screen.getByLabelText(/Select Instance/i),
      /test2/,
    );

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.getAll('labels')).toEqual(
      expect.arrayContaining(['instance=test2']),
    );
  });

  it('changes the namespace via the selector and submits under the new namespace', async () => {
    mockAxiosGet({
      'testserver/namespaces/': () =>
        Promise.resolve({
          status: 200,
          data: [
            {
              name: 'test_namespace',
              permissions: [{ username: 'admin', permission: 7 }],
            },
            {
              name: 'other_namespace',
              permissions: [{ username: 'admin', permission: 7 }],
            },
          ],
        }),
      'testserver/namespaces/other_namespace': () =>
        Promise.resolve({ status: 200, data: [] }),
    });
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));

    await act(async () => {
      await selectEvent.select(
        screen.getByLabelText(/Select a Namespace/i),
        'other_namespace',
      );
    });

    await waitFor(() =>
      expect(screen.getByLabelText(/Use a Registered Model\?/i)).toBeDisabled(),
    );

    const modelInput = screen.getByLabelText(/Drop static model files here/i);
    const modelFile = new File(['* dummy'], 'mymodel.gms', {
      type: 'text/plain',
    });
    await user.upload(modelInput, modelFile);

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('namespace')).toBe('other_namespace');
  });

  it('selects a different registered model (exercising the sorted options list)', async () => {
    mockAxiosGet({
      'testserver/namespaces/test_namespace': () =>
        Promise.resolve({
          status: 200,
          data: [{ name: 'zebra_model.zip' }, { name: 'alpha_model.zip' }],
        }),
    });
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    await selectEvent.select(
      screen.getByLabelText(/Select a Model/i),
      'alpha_model.zip',
    );

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('model')).toBe('alpha_model.zip');
  });

  it('changes and submits a different priority', async () => {
    mockAxiosGet();
    axios.post.mockResolvedValue({ data: {} });

    render(<JobSubmissionForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{
            in_kubernetes: false,
            serverConfig: { job_priorities_access: 'ENABLED' },
          }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() => screen.findByText(/Submit Job/));
    await user.click(screen.getByRole('button', { name: /Advanced Options/i }));
    await user.click(screen.getByLabelText(/Use a Registered Model\?/i));

    await selectEvent.select(screen.getByLabelText(/^Priority$/i), 'high');

    await user.click(screen.getByRole('button', { name: /Submit Job/i }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const formData = axios.post.mock.calls[0][1];
    expect(formData.get('priority')).toBe('high');
  });
});
