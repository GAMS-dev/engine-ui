import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { useContext } from 'react';

import ServerConfigProvider from '../providers/ServerConfigProvider';
import ServerConfigContext from '../contexts/ServerConfigContext';
import AlertContext from '../contexts/AlertContext';

vi.mock('axios');

// Dummy consumer exposing the serverConfig state and the updateServerState
// function so tests can exercise both the fetch-on-mount effect and the
// patch/update logic.
const DummyConsumer = () => {
  const [serverConfig, updateServerState] = useContext(ServerConfigContext);

  return (
    <div>
      <span data-testid="config">{JSON.stringify(serverConfig)}</span>
      <button
        type="button"
        data-testid="update-with-data"
        onClick={() => updateServerState({ foo: 'bar' })}
      >
        update with data
      </button>
      <button
        type="button"
        data-testid="update-with-null"
        onClick={() => updateServerState(null)}
      >
        update with null
      </button>
      <button
        type="button"
        data-testid="update-with-empty"
        onClick={() => updateServerState({})}
      >
        update with empty
      </button>
    </div>
  );
};

describe('ServerConfigProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches server configuration on mount and provides it via context', async () => {
    axios.get.mockResolvedValue({ data: { max_jobs: 5 } });

    render(
      <ServerConfigProvider>
        <DummyConsumer />
      </ServerConfigProvider>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/configuration'),
      );
    });

    expect(await screen.findByTestId('config')).toHaveTextContent(
      '{"max_jobs":5}',
    );
  });

  it('sets an alert message when the initial fetch fails', async () => {
    axios.get.mockRejectedValue(new Error('boom'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <ServerConfigProvider>
          <DummyConsumer />
        </ServerConfigProvider>
      </AlertContext.Provider>,
    );

    await waitFor(() => {
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems fetching configuration. Error message: boom',
      );
    });
  });

  it('does nothing when updateServerState is called without a new config', async () => {
    axios.get.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(
      <ServerConfigProvider>
        <DummyConsumer />
      </ServerConfigProvider>,
    );

    await screen.findByTestId('config');
    axios.get.mockClear();

    await user.click(screen.getByTestId('update-with-null'));

    expect(axios.patch).not.toHaveBeenCalled();
    expect(screen.getByTestId('config')).toHaveTextContent('{}');
  });

  it('does nothing when updateServerState is called with an empty config object', async () => {
    axios.get.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(
      <ServerConfigProvider>
        <DummyConsumer />
      </ServerConfigProvider>,
    );

    await screen.findByTestId('config');

    await user.click(screen.getByTestId('update-with-empty'));

    expect(axios.patch).not.toHaveBeenCalled();
    expect(screen.getByTestId('config')).toHaveTextContent('{}');
  });

  it('patches the server configuration and updates state when given a valid new config', async () => {
    axios.get.mockResolvedValue({ data: { existing: 'value' } });
    axios.patch.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(
      <ServerConfigProvider>
        <DummyConsumer />
      </ServerConfigProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('config')).toHaveTextContent(
        '{"existing":"value"}',
      ),
    );

    await user.click(screen.getByTestId('update-with-data'));

    await waitFor(() => {
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/configuration'),
        expect.any(FormData),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('config')).toHaveTextContent(
        '{"existing":"value","foo":"bar"}',
      ),
    );
  });
});
