import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils.jsx';

import TextEntryView from '../components/TextEntryView';
import axios from 'axios';
import { useParams } from 'react-router-dom';

vi.mock('axios');
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

describe('TextEntryView', () => {
  const mockServer = 'testserver';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({ token: 'token1234' });
  });

  it('renders TextEntryView and displays text content correctly', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        entry_name: 'file1.txt',
        entry_value: 'Hello World! This is a test file.',
      },
    });

    render(
      <TextEntryView
        server={mockServer}
        textEntries={[{ entry_name: 'file1.txt', entry_value: 'file1.txt' }]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    expect(await screen.findByText('Text Entries')).toBeInTheDocument();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'testserver/jobs/token1234/text-entry',
        expect.objectContaining({
          params: expect.objectContaining({ entry_name: 'file1.txt' }),
        }),
      );
    });

    const textarea = screen.getByRole('textbox', { name: /value/i });
    await waitFor(() => {
      expect(textarea).toHaveValue('Hello World! This is a test file.');
    });
  });

  it('shows truncation warning if text exceeds viewCharLimit', async () => {
    // Create a string that is 1,000,001 characters long
    const massiveString = 'a'.repeat(1000001);

    axios.get.mockResolvedValueOnce({
      data: {
        entry_name: 'large_file.txt',
        entry_value: massiveString,
      },
    });

    render(
      <TextEntryView
        server={mockServer}
        textEntries={[
          { entry_name: 'large_file.txt', entry_value: 'large_file.txt' },
        ]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    expect(
      await screen.findByText(
        /The text entry is too large to be displayed here and was truncated/i,
      ),
    ).toBeInTheDocument();
  });

  it('fetches new data when a different option is selected from the dropdown', async () => {
    const user = userEvent.setup();

    // Mock the first fetch (Default index 0)
    axios.get.mockResolvedValueOnce({
      data: { entry_name: 'file1.txt', entry_value: 'File 1 Content' },
    });

    render(
      <TextEntryView
        server={mockServer}
        textEntries={[
          { entry_name: 'file1.txt', entry_value: 'val1' },
          { entry_name: 'file2.txt', entry_value: 'val2' },
        ]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    const textarea = screen.getByRole('textbox', { name: /value/i });
    await waitFor(() => {
      expect(textarea).toHaveValue('File 1 Content');
    });

    // Mock the second fetch (Triggered by dropdown change)
    axios.get.mockResolvedValueOnce({
      data: { entry_name: 'file2.txt', entry_value: 'File 2 Content' },
    });

    // Select the second option. (Note: we select by the value assigned to the `<option>` tag)
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'val2');

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'testserver/jobs/token1234/text-entry',
        expect.objectContaining({
          params: expect.objectContaining({ entry_name: 'file2.txt' }),
        }),
      );
    });

    await waitFor(() => {
      expect(textarea).toHaveValue('File 2 Content');
    });
  });

  it('successfully caches entries and switches back and forth without errors (regression test)', async () => {
    const user = userEvent.setup();

    // Setup a dynamic mock that responds differently based on the requested file
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.entry_name === 'file_A.txt') {
        return Promise.resolve({ data: { entry_value: 'Content for File A' } });
      }
      if (config?.params?.entry_name === 'file_B.txt') {
        return Promise.resolve({ data: { entry_value: 'Content for File B' } });
      }
      return Promise.reject(new Error('File not found'));
    });

    render(
      <TextEntryView
        server={mockServer}
        textEntries={[
          { entry_name: 'file_A.txt', entry_value: 'val_a' },
          { entry_name: 'file_B.txt', entry_value: 'val_b' },
        ]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    const textarea = screen.getByRole('textbox', { name: /value/i });
    const select = screen.getByRole('combobox');

    // Verify initial load (File A)
    await waitFor(() => {
      expect(textarea).toHaveValue('Content for File A');
    });
    expect(axios.get).toHaveBeenCalledTimes(1); // API called once for File A

    // Switch to File B
    await user.selectOptions(select, 'val_b');
    await waitFor(() => {
      expect(textarea).toHaveValue('Content for File B');
    });
    expect(axios.get).toHaveBeenCalledTimes(2); // API called a second time for File B

    // THE BUG SCENARIO: Switch back to File A
    await user.selectOptions(select, 'val_a');

    // Verify the text successfully switched back (proving no crash occurred)
    await waitFor(() => {
      expect(textarea).toHaveValue('Content for File A');
    });

    // Verify the cache was used (proving no 3rd API call was made)
    expect(axios.get).toHaveBeenCalledTimes(2);
  });
});
