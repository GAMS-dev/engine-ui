import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import NamespaceQuotaUpdateForm from '../components/NamespaceQuotaUpdateForm';
import axios from 'axios';

vi.mock('axios');

describe('NamespaceQuotaUpdateForm', () => {
  let setShowDialog;
  let handleSuccess;

  beforeEach(() => {
    vi.clearAllMocks();
    setShowDialog = vi.fn();
    handleSuccess = vi.fn();

    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/namespaces/global/disk-quota':
          return Promise.resolve({
            status: 200,
            data: {
              name: 'global',
              disk_quota: null,
              disk_use: 0,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  const renderForm = (overrides = {}) =>
    render(
      <NamespaceQuotaUpdateForm
        showDialog={true}
        setShowDialog={setShowDialog}
        namespace="global"
        handleSuccess={handleSuccess}
        {...overrides}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );

  it('renders NamespaceQuotaUpdateForm correctly', async () => {
    renderForm();
    await waitFor(() =>
      screen.findByText('Edit Disk Space Quota of Namespace: global'),
    );
  });

  it('does not fetch data or render when the dialog is closed', () => {
    renderForm({ showDialog: false });
    expect(axios.get).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Edit Disk Space Quota of Namespace: global'),
    ).not.toBeInTheDocument();
  });

  it('closes the dialog when Cancel is clicked', async () => {
    renderForm();
    await screen.findByRole('spinbutton');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(setShowDialog).toHaveBeenCalledWith(false);
  });

  it('displays the existing quota and disk usage when present', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/namespaces/global/disk-quota':
          return Promise.resolve({
            status: 200,
            data: {
              name: 'global',
              disk_quota: 5000000,
              disk_use: 2500000,
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    renderForm();

    const quotaInput = await screen.findByRole('spinbutton');
    expect(quotaInput).toHaveValue(5);
    expect(
      await screen.findByText(/Disk Space used: 2.5 MB/),
    ).toBeInTheDocument();
  });

  it('shows an error message when fetching the quota fails', async () => {
    axios.get.mockRejectedValue({ message: 'get failed' });

    renderForm();

    await waitFor(() =>
      screen.findByText(
        /An error occurred while retrieving namespace quota. Error message: get failed./,
      ),
    );
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('marks the quota field invalid and blocks submission for non-integer input', async () => {
    renderForm();

    const quotaInput = await screen.findByRole('spinbutton');
    fireEvent.change(quotaInput, { target: { value: '.5' } });

    expect(quotaInput).toHaveClass('is-invalid');
    // The field must keep showing exactly what was typed, not NaN.
    expect(quotaInput).toHaveValue(0.5);

    fireEvent.click(screen.getByRole('button', { name: 'Update Quota' }));

    expect(axios.put).not.toHaveBeenCalled();
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('clears the invalid state and resets the quota when the field is emptied', async () => {
    renderForm();

    const quotaInput = await screen.findByRole('spinbutton');
    fireEvent.change(quotaInput, { target: { value: '.5' } });
    expect(quotaInput).toHaveClass('is-invalid');

    fireEvent.change(quotaInput, { target: { value: '' } });

    expect(quotaInput).not.toHaveClass('is-invalid');
    expect(quotaInput).toHaveValue(null);
  });

  it('submits an updated quota via PUT, shows success and closes the dialog', async () => {
    const setAlertMsg = vi.fn();
    axios.put.mockResolvedValue({});

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <NamespaceQuotaUpdateForm
          showDialog={true}
          setShowDialog={setShowDialog}
          namespace="global"
          handleSuccess={handleSuccess}
        />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapperDefault },
    );

    const quotaInput = await screen.findByRole('spinbutton');
    fireEvent.change(quotaInput, { target: { value: '100' } });

    fireEvent.click(screen.getByRole('button', { name: 'Update Quota' }));

    await waitFor(() =>
      expect(axios.put).toHaveBeenCalledWith(
        'testserver/namespaces/global/disk-quota',
        null,
        { params: { disk_quota: 100000000 } },
      ),
    );
    expect(axios.delete).not.toHaveBeenCalled();
    await waitFor(() => expect(setShowDialog).toHaveBeenCalledWith(false));
    expect(handleSuccess).toHaveBeenCalled();
  });

  it('submits a quota deletion via DELETE when the field is left empty', async () => {
    axios.delete.mockResolvedValue({});

    renderForm();

    await screen.findByRole('spinbutton');

    fireEvent.click(screen.getByRole('button', { name: 'Update Quota' }));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/namespaces/global/disk-quota',
      ),
    );
    expect(axios.put).not.toHaveBeenCalled();
    await waitFor(() => expect(setShowDialog).toHaveBeenCalledWith(false));
    expect(handleSuccess).toHaveBeenCalled();
  });

  it('shows a submission error message and re-enables the form on failure', async () => {
    axios.put.mockRejectedValue({ message: 'put failed' });

    renderForm();

    const quotaInput = await screen.findByRole('spinbutton');
    fireEvent.change(quotaInput, { target: { value: '100' } });

    const submitButton = screen.getByRole('button', { name: 'Update Quota' });
    fireEvent.click(submitButton);

    await waitFor(() =>
      screen.findByText(
        /An error occurred while updating namespace quota. Error message: put failed./,
      ),
    );
    expect(submitButton).not.toBeDisabled();
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});
