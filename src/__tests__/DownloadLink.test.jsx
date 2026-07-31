import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import DownloadLink from '../components/DownloadLink';
import axios from 'axios';
import AlertContext from '../contexts/AlertContext';

vi.mock('axios');

describe('DownloadLink', () => {
  let cancel;

  beforeEach(() => {
    vi.clearAllMocks();

    axios.mockResolvedValue({
      status: 200,
      data: 'someData',
    });

    // Mock the CancelToken source and axios get method
    cancel = vi.fn();
    axios.isCancel = vi.fn().mockReturnValue(false);

    // You can also mock CancelToken source if needed
    axios.CancelToken.source = vi.fn(() => ({
      token: { cancel },
      cancel,
    }));

    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  it('renders DownloadLink correctly', async () => {
    render(<DownloadLink url="download/url" />);
    await expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders the children as the button label', () => {
    render(<DownloadLink url="download/url">Download me</DownloadLink>);
    expect(
      screen.getByRole('button', { name: 'Download me' }),
    ).toBeInTheDocument();
  });

  it('fetches the file and triggers a browser download on click', async () => {
    const user = userEvent.setup();
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    render(
      <DownloadLink url="download/url" filename="myfile.txt">
        Download
      </DownloadLink>,
    );

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'download/url',
          method: 'GET',
          responseType: 'blob',
        }),
      );
    });

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    const createdLink = appendChildSpy.mock.calls.find(
      (call) => call[0].tagName === 'A',
    )[0];
    expect(createdLink.getAttribute('download')).toBe('myfile.txt');
    expect(createdLink.href).toBe('blob:mock-url');

    // Button becomes re-enabled again after the download completes
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download' }),
      ).not.toBeDisabled();
    });

    appendChildSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('uses a json responseType and extracts the given subkey when jsonSubkey is provided', async () => {
    const user = userEvent.setup();
    axios.mockResolvedValue({
      status: 200,
      data: { payload: 'jsonContent' },
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <DownloadLink
        url="download/url"
        filename="myfile.json"
        jsonSubkey="payload"
      >
        Download
      </DownloadLink>,
    );

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({ responseType: 'json' }),
      );
    });

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });
  });

  it('shows an alert message and re-enables the button when the request fails', async () => {
    const user = userEvent.setup();
    axios.mockRejectedValue(new Error('Network error'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <DownloadLink url="download/url" filename="myfile.txt">
          Download
        </DownloadLink>
      </AlertContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(setAlertMsg).toHaveBeenCalledWith(
        expect.stringContaining('Problems fetching myfile.txt'),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download' }),
      ).not.toBeDisabled();
    });
  });

  it('resets the cancel token instead of showing an alert when the request is cancelled', async () => {
    const user = userEvent.setup();
    axios.isCancel.mockReturnValue(true);
    axios.mockRejectedValue(new Error('cancelled'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <DownloadLink url="download/url" filename="myfile.txt">
          Download
        </DownloadLink>
      </AlertContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Download' }),
      ).not.toBeDisabled();
    });

    expect(setAlertMsg).not.toHaveBeenCalled();
    // A fresh cancel token source is created for the next download attempt
    expect(axios.CancelToken.source).toHaveBeenCalled();
  });

  it('shows a percentage and a cancel button while the download is in progress, and cancels on click', async () => {
    const user = userEvent.setup();
    let capturedConfig;
    axios.mockImplementation((config) => {
      capturedConfig = config;
      return new Promise(() => {}); // never resolves - stays "in progress"
    });

    render(
      <DownloadLink url="download/url" filename="myfile.txt">
        Download
      </DownloadLink>,
    );

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(capturedConfig).toBeDefined();
    });

    // Simulate a progress event with a known total
    act(() => {
      capturedConfig.onDownloadProgress({ loaded: 50, total: 100 });
    });

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'x' });
    await user.click(cancelButton);

    expect(cancel).toHaveBeenCalled();
  });

  it('falls back to the Content-Length response header when progressEvent.total is not available', async () => {
    const user = userEvent.setup();
    let capturedConfig;
    axios.mockImplementation((config) => {
      capturedConfig = config;
      return new Promise(() => {});
    });

    render(
      <DownloadLink url="download/url" filename="myfile.txt">
        Download
      </DownloadLink>,
    );

    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(capturedConfig).toBeDefined();
    });

    act(() => {
      capturedConfig.onDownloadProgress({
        loaded: 25,
        total: 0,
        srcElement: {
          getResponseHeader: vi.fn().mockReturnValue('100'),
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });
});
