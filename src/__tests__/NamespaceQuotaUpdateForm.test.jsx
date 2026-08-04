import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import NamespaceQuotaUpdateForm from '../components/NamespaceQuotaUpdateForm';
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

const routes = [
  { path: '/models/global', element: <p>navigated to models page</p> },
];

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault options={{ routes: routes }}>
    {children}
  </AllProvidersWrapperDefault>
);

describe('NamespaceQuotaUpdateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ namespace: 'global' });

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
  it('renders NamespaceQuotaUpdateForm correctly', async () => {
    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() =>
      screen.findByText('Edit Disk Space Quota of Namespace: global'),
    );
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

    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    const quotaInput = await screen.findByRole('spinbutton');
    expect(quotaInput).toHaveValue(5);
    expect(
      await screen.findByText(/Disk Space used: 2.5 MB/),
    ).toBeInTheDocument();
  });

  it('shows an error message when fetching the quota fails', async () => {
    axios.get.mockRejectedValue({ message: 'get failed' });

    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await waitFor(() =>
      screen.findByText(
        /An error occurred while retrieving namespace quota. Error message: get failed./,
      ),
    );
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('marks the quota field invalid and blocks submission for non-integer input', async () => {
    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapper,
    });

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
    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapper,
    });

    const quotaInput = await screen.findByRole('spinbutton');
    fireEvent.change(quotaInput, { target: { value: '.5' } });
    expect(quotaInput).toHaveClass('is-invalid');

    fireEvent.change(quotaInput, { target: { value: '' } });

    expect(quotaInput).not.toHaveClass('is-invalid');
    expect(quotaInput).toHaveValue(null);
  });

  it('submits an updated quota via PUT, shows success and navigates', async () => {
    const setAlertMsg = vi.fn();
    axios.put.mockResolvedValue({});

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <NamespaceQuotaUpdateForm />
      </AlertContext.Provider>,
      { wrapper: AllProvidersWrapper },
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
    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'success:Namespace quota successfully updated!',
      ),
    );
    await waitFor(() => screen.findByText('navigated to models page'));
  });

  it('submits a quota deletion via DELETE when the field is left empty', async () => {
    axios.delete.mockResolvedValue({});

    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapper,
    });

    await screen.findByRole('spinbutton');

    fireEvent.click(screen.getByRole('button', { name: 'Update Quota' }));

    await waitFor(() =>
      expect(axios.delete).toHaveBeenCalledWith(
        'testserver/namespaces/global/disk-quota',
      ),
    );
    expect(axios.put).not.toHaveBeenCalled();
    await waitFor(() => screen.findByText('navigated to models page'));
  });

  it('shows a submission error message and re-enables the form on failure', async () => {
    axios.put.mockRejectedValue({ message: 'put failed' });

    render(<NamespaceQuotaUpdateForm />, {
      wrapper: AllProvidersWrapper,
    });

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
  });
});
