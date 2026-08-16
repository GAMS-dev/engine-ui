import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { useContext } from 'react';

import ServerInfoProvider from '../providers/ServerInfoProvider';
import ServerInfoContext from '../contexts/ServerInfoContext';

vi.mock('axios');

// Dummy Consumer
const DummyConsumer = () => {
  const [serverInfo] = useContext(ServerInfoContext);

  // If the state is false/null initially, show a loading state
  if (!serverInfo) return <div data-testid="loading">No Info</div>;

  return (
    <div>
      <span data-testid="version">{serverInfo.version}</span>
      <span data-testid="brokerv2">
        {serverInfo.use_brokerv2 ? 'true' : 'false'}
      </span>
      <span data-testid="saas">{serverInfo.is_saas ? 'true' : 'false'}</span>
    </div>
  );
};

describe('ServerInfoProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Explicitly go through `window` rather than the bare `localStorage`
    // global. In at least one environment (reproduced running the test
    // suite inside the project's own CI container image) the bare
    // identifier resolved to a different Storage instance than the one the
    // rendered component actually reads/writes via its own `window`,
    // making the two look completely disconnected: a spy on
    // Storage.prototype.setItem saw zero calls, and getItem() never saw
    // what the component wrote, even though the component's own rendered
    // output proved the write must have already run.
    window.localStorage.clear();
  });

  it('fetches server info when no valid cache exists', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/version'))
        return Promise.resolve({ data: { version: 'x.x.x' } });
      if (url.includes('/configuration'))
        return Promise.resolve({ data: { use_brokerv2: true } });
      return Promise.reject(new Error('not found'));
    });

    render(
      <ServerInfoProvider>
        <DummyConsumer />
      </ServerInfoProvider>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/version'),
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/configuration'),
      );
    });

    expect(await screen.findByTestId('version')).toHaveTextContent('x.x.x');
    expect(screen.getByTestId('brokerv2')).toHaveTextContent('false'); // since is_saas if false
    expect(screen.getByTestId('saas')).toHaveTextContent('false'); // since the hostname is testserver and not engine.gams.com

    await waitFor(() => {
      const cachedData = JSON.parse(window.localStorage.getItem('serverInfo'));
      expect(cachedData.version).toBe('x.x.x');
      expect(cachedData.use_brokerv2).toBe(false);
      expect(cachedData.timestamp).toBeDefined();
    });
  });

  it('fetches server info when no valid cache exists (using SaaS domain)', async () => {
    vi.stubGlobal('location', {
      ...window.location,
      hostname: 'engine.gams.com',
    });
    expect(window.location.hostname).toBe('engine.gams.com');
    axios.get.mockImplementation((url) => {
      if (url.includes('/version'))
        return Promise.resolve({ data: { version: 'x.x.x' } });
      if (url.includes('/configuration'))
        return Promise.resolve({ data: { use_brokerv2: true } });
      return Promise.reject(new Error('not found'));
    });

    render(
      <ServerInfoProvider>
        <DummyConsumer />
      </ServerInfoProvider>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/version'),
      );
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/configuration'),
      );
    });

    expect(await screen.findByTestId('version')).toHaveTextContent('x.x.x');
    expect(screen.getByTestId('saas')).toHaveTextContent('true');
    expect(screen.getByTestId('brokerv2')).toHaveTextContent('true');

    await waitFor(() => {
      const cachedData = JSON.parse(window.localStorage.getItem('serverInfo'));
      expect(cachedData.version).toBe('x.x.x');
      expect(cachedData.use_brokerv2).toBe(true);
      expect(cachedData.timestamp).toBeDefined();
    });
    vi.unstubAllGlobals();
  });

  it('does not fetch data if valid, up-to-date cached data is present', async () => {
    const validCache = {
      version: '40.0.0',
      is_saas: true,
      use_brokerv2: false,
      timestamp: new Date().getTime(),
    };
    window.localStorage.setItem('serverInfo', JSON.stringify(validCache));

    render(
      <ServerInfoProvider>
        <DummyConsumer />
      </ServerInfoProvider>,
    );

    expect(await screen.findByTestId('version')).toHaveTextContent('40.0.0');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('defaults use_brokerv2 to false if the endpoint omits it', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/version'))
        return Promise.resolve({ data: { version: 'x.x.x' } });
      if (url.includes('/configuration'))
        return Promise.resolve({ data: { some_other_key: true } }); // Missing use_brokerv2
      return Promise.reject(new Error('not found'));
    });

    render(
      <ServerInfoProvider>
        <DummyConsumer />
      </ServerInfoProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('version')).toHaveTextContent('x.x.x');
    });
    expect(screen.getByTestId('brokerv2')).toHaveTextContent('false');
  });
});
