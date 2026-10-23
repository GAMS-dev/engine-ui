import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import ModelSubmissionForm from '../components/ModelSubmissionForm';
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

// Mock FileDropZone to render a simple file input so we can easily test file uploads
vi.mock('../components/FileDropZone', () => ({
  __esModule: true,
  default: ({ onDrop, label, multiple }) => (
    <div>
      <label htmlFor={`mock-dropzone-${label}`}>{label}</label>
      <input
        id={`mock-dropzone-${label}`}
        type="file"
        multiple={multiple}
        onChange={(e) => onDrop(Array.from(e.target.files))}
      />
    </div>
  ),
}));

import { useParams } from 'react-router';

describe('ModelSubmissionForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.mocked(useParams).mockReturnValue({
      modelname: 'transport',
      namespace: 'global',
    });

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/namespaces/global':
          return Promise.resolve({
            status: 200,
            data: [],
          });
        case 'testserver/namespaces/global/user-groups':
          return Promise.resolve({
            status: 200,
            data: [
              {
                label: 'string',
                created_at: '2021-08-04T17:10:15.000000+00:00',
                created_by: {
                  username: 'string',
                  deleted: true,
                  old_username: 'string',
                },
                owned_by: 'string',
                members: [
                  {
                    username: 'string',
                    added_at: '2021-08-04T17:10:15.000000+00:00',
                    added_by: {
                      username: 'string',
                      deleted: true,
                      old_username: 'string',
                    },
                  },
                ],
              },
            ],
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });
  it('renders ModelSubmissionForm correctly', async () => {
    render(<ModelSubmissionForm namespace={{ permission: 110 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Update model/));
  });

  it('shows the not-found error when the model does not exist in the namespace', async () => {
    render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() =>
      expect(
        screen.getByText(
          /Model: transport does not exist in namespace: global/i,
        ),
      ).toBeInTheDocument(),
    );
  });

  it('shows an error when retrieving model info fails', async () => {
    axios.get.mockImplementation((url) => {
      if (url === 'testserver/namespaces/global') {
        return Promise.reject(new Error('model service down'));
      }
      return Promise.reject(new Error('not found'));
    });

    render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
    await waitFor(() =>
      expect(
        screen.getByText(/Problems while while retrieving model info/i),
      ).toBeInTheDocument(),
    );
  });

  describe('add mode', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({
        modelname: undefined,
        namespace: 'global',
      });
    });

    it('renders the add-model form and fetches available user groups', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));
      expect(
        screen.getByPlaceholderText(/Identifier for the model/i),
      ).toBeInTheDocument();
      expect(axios.get).toHaveBeenCalledWith(
        'testserver/namespaces/global/user-groups',
      );
    });

    it('shows an error when fetching user groups fails', async () => {
      axios.get.mockImplementation((url) => {
        if (url === 'testserver/namespaces/global/user-groups') {
          return Promise.reject(new Error('groups service down'));
        }
        return Promise.reject(new Error('not found'));
      });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() =>
        expect(
          screen.getByText(/Problems while while user group info/i),
        ).toBeInTheDocument(),
      );
      expect(
        screen.queryByPlaceholderText(/Identifier for the model/i),
      ).not.toBeInTheDocument();
    });

    it('shows a validation error when the model name ends with .gms', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel.gms',
      );
      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/Model name must not end with '\.gms'!/i),
        ).toBeInTheDocument(),
      );
      expect(axios).not.toHaveBeenCalled();
    });

    it('shows an error when no model data is provided', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel',
      );
      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/No model data provided!/i),
        ).toBeInTheDocument(),
      );
      expect(axios).not.toHaveBeenCalled();
    });

    it('submits a new model with a single zip file and no optional fields', async () => {
      axios.mockResolvedValue({ data: {} });
      const setAlertMsg = vi.fn();

      render(
        <AlertContext.Provider value={['', setAlertMsg]}>
          <ModelSubmissionForm />
        </AlertContext.Provider>,
        { wrapper: AllProvidersWrapperDefault },
      );
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel',
      );
      const fileInput = screen.getByLabelText(/Drop model files here/i);
      const zipFile = new File(['a'.repeat(50)], 'model.zip', {
        type: 'application/zip',
      });
      await user.upload(fileInput, zipFile);

      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const call = axios.mock.calls[0][0];
      expect(call.method).toBe('post');
      expect(call.url).toBe('testserver/namespaces/global/models/mymodel');
      const formData = call.data;
      expect(formData.get('protect_model_files')).toBe('false');
      expect(formData.get('delete_arguments')).toBeNull();
      expect(formData.get('delete_text_entries')).toBeNull();
      expect(formData.get('delete_stream_entries')).toBeNull();
      expect(formData.get('delete_inex_file')).toBeNull();
      expect(formData.get('input_inex_string')).toBeNull();
      expect(formData.get('delete_input_inex')).toBeNull();
      expect(formData.get('delete_run')).toBeNull();
      expect(formData.get('delete_user_groups')).toBeNull();
      await waitFor(() =>
        expect(setAlertMsg).toHaveBeenCalledWith(
          'success:Model successfully added!',
        ),
      );
    });

    it('shows an error message when registering a model fails', async () => {
      axios.mockRejectedValue(new Error('boom'));

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel',
      );
      const fileInput = screen.getByLabelText(/Drop model files here/i);
      const zipFile = new File(['a'.repeat(50)], 'model.zip', {
        type: 'application/zip',
      });
      await user.upload(fileInput, zipFile);

      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() =>
        expect(
          screen.getByText(
            /Problems while registering model\. Error message: boom\./i,
          ),
        ).toBeInTheDocument(),
      );
    });
  });

  describe('edit mode with existing model data', () => {
    const modelResponse = {
      name: 'transport',
      run: 'main.gms',
      arguments: ['--a', '--b'],
      text_entries: ['t1'],
      stream_entries: ['s1'],
      inex: { type: 'include', files: ['f1'], globbing_enabled: true },
      protect_model_files: true,
      user_groups: ['g1'],
    };

    beforeEach(() => {
      axios.get.mockImplementation((url) => {
        switch (url) {
          case 'testserver/namespaces/global':
            return Promise.resolve({ status: 200, data: [modelResponse] });
          case 'testserver/namespaces/global/user-groups':
            return Promise.resolve({
              status: 200,
              data: [{ label: 'g1' }, { label: 'g2' }],
            });
          default:
            return Promise.reject(new Error('not found'));
        }
      });
    });

    it('populates all fields from the fetched model data', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      expect(screen.getByDisplayValue('main.gms')).toBeInTheDocument();
      expect(screen.getByDisplayValue('--a,--b')).toBeInTheDocument();
      expect(screen.getByDisplayValue('t1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('s1')).toBeInTheDocument();
      expect(
        screen.getByLabelText(/protected from being overwritten/i),
      ).toBeChecked();
      expect(screen.getByText('g1')).toBeInTheDocument();
      expect(screen.getByText(/Enable globbing/i)).toBeInTheDocument();
    });

    it('does not override pre-filled name fields when a replacement file is uploaded', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      const fileInput = screen.getByLabelText(/Drop updated model files here/i);
      const replacementFile = new File(['a'.repeat(20)], 'replacement.gms', {
        type: 'text/plain',
      });
      await user.upload(fileInput, replacementFile);

      expect(screen.getByDisplayValue('main.gms')).toBeInTheDocument();
    });

    it('submits deletion sentinels when optional fields are cleared', async () => {
      axios.mockResolvedValue({ data: {} });
      const setAlertMsg = vi.fn();

      render(
        <AlertContext.Provider value={['', setAlertMsg]}>
          <ModelSubmissionForm />
        </AlertContext.Provider>,
        { wrapper: AllProvidersWrapperDefault },
      );
      await waitFor(() => screen.findByText(/Update model/i));

      await user.clear(screen.getByDisplayValue('--a,--b'));
      await user.clear(screen.getByDisplayValue('t1'));
      await user.clear(screen.getByDisplayValue('s1'));
      await user.click(screen.getByLabelText(/Filter results/i));

      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const call = axios.mock.calls[0][0];
      expect(call.method).toBe('patch');
      const formData = call.data;
      expect(formData.get('delete_arguments')).toBe('true');
      expect(formData.get('delete_text_entries')).toBe('true');
      expect(formData.get('delete_stream_entries')).toBe('true');
      expect(formData.get('delete_inex_file')).toBe('true');
      await waitFor(() =>
        expect(setAlertMsg).toHaveBeenCalledWith(
          'success:Model successfully updated!',
        ),
      );
    });

    it('submits the input INEX of a protected model', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      await user.click(screen.getByLabelText(/Restrict which files/i));
      await user.type(
        screen.getByPlaceholderText(/Files a job may provide/i),
        '*.gdx, *.csv',
      );
      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const formData = axios.mock.calls[0][0].data;
      expect(JSON.parse(formData.get('input_inex_string'))).toEqual({
        type: 'include',
        files: ['*.gdx', '*.csv'],
        globbing_enabled: true,
      });
      expect(formData.get('delete_input_inex')).toBeNull();
    });

    it('refuses to submit a protected model with an empty input INEX', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      await user.click(screen.getByLabelText(/Restrict which files/i));
      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      expect(
        await screen.findByText(/Enter at least one file pattern/),
      ).toBeInTheDocument();
      expect(axios).not.toHaveBeenCalled();
    });

    it.each([
      ['main.py', true],
      ['main.gms', false],
    ])(
      'mentions the Python input default in the tooltip for run file %s: %s',
      async (runFile, shown) => {
        render(<ModelSubmissionForm />, {
          wrapper: AllProvidersWrapperDefault,
        });
        await waitFor(() => screen.findByText(/Update model/i));

        const runInput = screen.getByDisplayValue('main.gms');
        await user.clear(runInput);
        await user.type(runInput, runFile);
        await user.hover(
          screen
            .getByLabelText(/protected from being overwritten/i)
            .parentElement.querySelector('.info-tooltip-icon'),
        );

        await screen.findByText(/cannot overwrite this/i);
        expect(screen.queryByText(/never receives/i) !== null).toBe(shown);
      },
    );

    it('deletes the input INEX when model files are no longer protected', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      await user.click(screen.getByLabelText(/Restrict which files/i));
      await user.type(
        screen.getByPlaceholderText(/Files a job may provide/i),
        '*.gdx',
      );
      await user.click(
        screen.getByLabelText(/protected from being overwritten/i),
      );
      expect(screen.queryByLabelText(/Restrict which files/i)).toBeNull();
      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const formData = axios.mock.calls[0][0].data;
      expect(formData.get('input_inex_string')).toBeNull();
      expect(formData.get('delete_input_inex')).toBe('true');
    });

    it('appends the run argument when it differs from the derived default', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      const runInput = screen.getByDisplayValue('main.gms');
      await user.clear(runInput);
      await user.type(runInput, 'other.gms');

      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const formData = axios.mock.calls[0][0].data;
      expect(formData.get('run')).toBe('other.gms');
    });

    it('shows an error message when updating a model fails', async () => {
      axios.mockRejectedValue(new Error('boom'));

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      await waitFor(() =>
        expect(
          screen.getByText(
            /Problems while updating model\. Error message: boom\./i,
          ),
        ).toBeInTheDocument(),
      );
    });

    const renderModelWith = async (overrides) => {
      axios.get.mockImplementation((url) =>
        url === 'testserver/namespaces/global'
          ? Promise.resolve({ data: [{ ...modelResponse, ...overrides }] })
          : Promise.resolve({ data: [] }),
      );
      axios.mockResolvedValue({ data: {} });
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));
    };
    const submittedForm = async () => {
      await user.click(screen.getByRole('button', { name: /Update Model/i }));
      await waitFor(() => expect(axios).toHaveBeenCalled());
      return axios.mock.calls[0][0].data;
    };

    it('shows and keeps a job_executable the run file cannot imply', async () => {
      await renderModelWith({ job_executable: 'julia' });

      const field = screen.getByLabelText('Job executable');
      expect(field).toHaveValue('julia');
      expect((await submittedForm()).get('job_executable')).toBe('julia');
    });

    it('derives job_executable from the run file once its field is cleared', async () => {
      await renderModelWith({ job_executable: 'julia' });

      await user.clear(screen.getByLabelText('Job executable'));
      const formData = await submittedForm();
      expect(formData.get('job_executable')).toBeNull();
      expect(formData.get('delete_job_executable')).toBe('true');
    });

    it.each(['gams', 'python', null])(
      'has no job_executable field for %s',
      async (jobExecutable) => {
        await renderModelWith({ job_executable: jobExecutable });
        expect(screen.queryByLabelText('Job executable')).toBeNull();
      },
    );

    it('submits deletion sentinels for env and job_executable when neither is set', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      await user.click(screen.getByRole('button', { name: /Update Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const formData = axios.mock.calls[0][0].data;
      expect(formData.get('env')).toBeNull();
      expect(formData.get('delete_env')).toBe('true');
      // main.gms uses Engine's default, so none may linger on the model.
      expect(formData.get('job_executable')).toBeNull();
      expect(formData.get('delete_job_executable')).toBe('true');
    });
  });

  describe('environment variables', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({
        modelname: undefined,
        namespace: 'global',
      });
    });

    const uploadZip = async () => {
      const fileInput = screen.getByLabelText(/Drop model files here/i);
      await user.upload(
        fileInput,
        new File(['a'.repeat(50)], 'model.zip', { type: 'application/zip' }),
      );
    };

    it('submits the configured variables as an env JSON string', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel',
      );
      await uploadZip();
      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      await user.type(
        screen.getByLabelText('Environment variable 1 name'),
        'MY_VAR_1',
      );
      await user.type(
        screen.getByLabelText('Environment variable 1 value'),
        'test123',
      );

      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      expect(axios.mock.calls[0][0].data.get('env')).toBe(
        '{"MY_VAR_1":"test123"}',
      );
    });

    it('blocks submission while a variable is incomplete', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel',
      );
      await uploadZip();
      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      await user.type(
        screen.getByLabelText('Environment variable 1 value'),
        'orphaned',
      );

      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/fix the environment variables/i),
        ).toBeInTheDocument(),
      );
      expect(axios).not.toHaveBeenCalled();
    });

    it('populates the editor from an existing model’s env', async () => {
      vi.mocked(useParams).mockReturnValue({
        modelname: 'transport',
        namespace: 'global',
      });
      axios.get.mockImplementation((url) => {
        switch (url) {
          case 'testserver/namespaces/global':
            return Promise.resolve({
              status: 200,
              data: [
                {
                  name: 'transport',
                  run: 'main.gms',
                  arguments: [],
                  text_entries: [],
                  stream_entries: [],
                  inex: '',
                  env: { FROM_SERVER: 'yes' },
                  protect_model_files: false,
                },
              ],
            });
          case 'testserver/namespaces/global/user-groups':
            return Promise.resolve({ status: 200, data: [] });
          default:
            return Promise.reject(new Error('not found'));
        }
      });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Update model/i));

      expect(screen.getByLabelText('Environment variable 1 name')).toHaveValue(
        'FROM_SERVER',
      );
      expect(screen.getByLabelText('Environment variable 1 value')).toHaveValue(
        'yes',
      );
    });
  });

  describe('job_executable', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({
        modelname: undefined,
        namespace: 'global',
      });
    });

    const submitWithRunName = async (runName) => {
      axios.mockResolvedValue({ data: {} });
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.type(
        screen.getByPlaceholderText(/Identifier for the model/i),
        'mymodel',
      );
      await user.type(
        screen.getByPlaceholderText(/Name of the main file/i),
        runName,
      );
      await user.upload(
        screen.getByLabelText(/Drop model files here/i),
        new File(['a'.repeat(50)], 'model.zip', { type: 'application/zip' }),
      );
      await user.click(screen.getByRole('button', { name: /Add Model/i }));
      await waitFor(() => expect(axios).toHaveBeenCalled());
      return axios.mock.calls[0][0].data;
    };

    it('pre-fills the main file from a dropped .py file, keeping its own extension', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.upload(
        screen.getByLabelText(/Drop model files here/i),
        new File(['print(1)'], 'trnsport.py', { type: 'text/plain' }),
      );

      expect(screen.getByPlaceholderText(/Name of the main file/i)).toHaveValue(
        'trnsport.py',
      );
      // The model itself is still named without the extension.
      expect(
        screen.getByPlaceholderText(/Identifier for the model/i),
      ).toHaveValue('trnsport');
    });

    it('pre-fills the main file from a dropped .gms file', async () => {
      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.upload(
        screen.getByLabelText(/Drop model files here/i),
        new File(['* dummy'], 'trnsport.gms', { type: 'text/plain' }),
      );

      expect(screen.getByPlaceholderText(/Name of the main file/i)).toHaveValue(
        'trnsport.gms',
      );
    });

    it('submits a dropped .py file as the run file, with job_executable=python', async () => {
      axios.mockResolvedValue({ data: {} });

      render(<ModelSubmissionForm />, { wrapper: AllProvidersWrapperDefault });
      await waitFor(() => screen.findByText(/Add a model to namespace/i));

      await user.upload(
        screen.getByLabelText(/Drop model files here/i),
        new File(['print(1)'], 'trnsport.py', { type: 'text/plain' }),
      );
      await user.click(screen.getByRole('button', { name: /Add Model/i }));

      await waitFor(() => expect(axios).toHaveBeenCalled());
      const formData = axios.mock.calls[0][0].data;
      expect(formData.get('run')).toBe('trnsport.py');
      expect(formData.get('job_executable')).toBe('python');
    });

    it('sets job_executable=python for a .py run file', async () => {
      const formData = await submitWithRunName('main.py');
      expect(formData.get('run')).toBe('main.py');
      expect(formData.get('job_executable')).toBe('python');
    });

    it('leaves job_executable unset for a .gms run file, falling back to gams', async () => {
      const formData = await submitWithRunName('main.gms');
      expect(formData.get('job_executable')).toBeNull();
    });

    it('recognises a .py run file regardless of case', async () => {
      const formData = await submitWithRunName('Main.PY');
      expect(formData.get('job_executable')).toBe('python');
    });
  });
});
