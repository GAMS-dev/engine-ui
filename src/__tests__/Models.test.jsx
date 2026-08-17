import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Models from '../components/Models';
import axios from 'axios';

vi.mock('axios');

const namespacesResponse = (overrides = {}) => ({
  status: 200,
  data: [
    {
      name: 'ns1',
      permissions: [
        { username: 'admin', permission: 7 },
        { username: 'bob', permission: 5 },
      ],
      disk_quota: null,
    },
    {
      name: 'ns2',
      permissions: [{ username: 'admin', permission: 7 }],
      disk_quota: null,
    },
  ],
  ...overrides,
});

const groupsResponse = (groups) => ({ status: 200, data: groups });
const modelsResponse = (models) => ({ status: 200, data: models });

const defaultMock =
  (extra = {}) =>
  (url) => {
    if (extra[url]) {
      return extra[url]();
    }
    switch (url) {
      case 'testserver/namespaces/':
        return Promise.resolve(namespacesResponse());
      case 'testserver/namespaces/ns1/user-groups':
        return Promise.resolve(
          groupsResponse([
            {
              label: 'group1',
              created_at: '2021-08-04T17:10:15.000000+00:00',
              created_by: { username: 'admin', deleted: false },
              members: [{ username: 'admin' }, { username: 'user2' }],
            },
            {
              label: 'group0',
              created_at: '2021-08-03T17:10:15.000000+00:00',
              created_by: { username: 'admin', deleted: false },
              members: [{ username: 'admin' }],
            },
          ]),
        );
      case 'testserver/namespaces/ns1':
        return Promise.resolve(
          modelsResponse([
            {
              name: 'model1',
              upload_date: '2021-08-04T17:10:15.000000+00:00',
              length: 2_500_000,
            },
            {
              name: 'model0',
              upload_date: '2021-08-03T17:10:15.000000+00:00',
              length: 500_000,
            },
          ]),
        );
      case 'testserver/namespaces/ns2/user-groups':
        return Promise.resolve(groupsResponse([]));
      case 'testserver/namespaces/ns2':
        return Promise.resolve(modelsResponse([]));
      default:
        return Promise.reject(new Error('not found'));
    }
  };

describe('Models', () => {
  beforeEach(() => {
    axios.get.mockImplementation(defaultMock());
  });

  it('renders Models correctly', async () => {
    render(<Models namespace={{ permission: 110 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Namespaces'));
  });

  it('shows "No Namespace Found" when the user has no accessible namespaces', async () => {
    axios.get.mockImplementation((url) => {
      switch (url) {
        case 'testserver/namespaces/':
          return Promise.resolve(
            namespacesResponse({
              data: [
                {
                  name: 'ns1',
                  permissions: [{ username: 'someoneelse', permission: 7 }],
                  disk_quota: null,
                },
              ],
            }),
          );
        default:
          return Promise.reject(new Error('not found'));
      }
    });

    render(<Models />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{ roles: ['user'], username: 'nobody' }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await waitFor(() =>
      expect(screen.getAllByText('No Namespace Found')).toHaveLength(2),
    );
  });

  it('stops loading and shows "No Namespace Found" if the namespaces request fails', async () => {
    axios.get.mockImplementation(() => Promise.reject(new Error('boom')));

    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() =>
      expect(screen.getAllByText('No Namespace Found')).toHaveLength(2),
    );
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('renders the Groups tab by default with data and admin actions', async () => {
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await screen.findByRole('row', { name: /group1.*2/ });

    // clicking Refresh re-fetches the namespace list while keeping the
    // currently-selected namespace active
    const namespacesCallsBefore = axios.get.mock.calls.filter(
      ([url]) => url === 'testserver/namespaces/',
    ).length;
    await user.click(screen.getByRole('button', { name: /Refresh/ }));
    await waitFor(() => {
      const namespacesCallsAfter = axios.get.mock.calls.filter(
        ([url]) => url === 'testserver/namespaces/',
      ).length;
      expect(namespacesCallsAfter).toBeGreaterThan(namespacesCallsBefore);
    });
    expect(screen.getByText('ns1').closest('li')).toHaveClass('active');
    expect(
      screen.getByRole('row', {
        name: 'Label Created Created By Members Actions',
      }),
    ).toBeInTheDocument();

    // admin-only namespace actions
    expect(
      screen.getByRole('button', { name: /Add Namespace/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Edit Quota/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Group/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Model/ })).toBeInTheDocument();

    // the group row has a "Show Members" link and a Delete button (admin, write perm)
    const groupRow = screen.getByRole('row', { name: /group1.*2/ });
    expect(
      within(groupRow).getByRole('link', { name: 'Show Members' }),
    ).toBeInTheDocument();
    expect(
      within(groupRow).getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });

  it('switches to the Models and Users tabs and loads their data', async () => {
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await screen.findByRole('tab', { name: 'Groups', selected: true });

    await user.click(screen.getByRole('tab', { name: 'Models' }));
    await screen.findByRole('row', { name: /model1/ });
    expect(screen.getByText('2.50MB')).toBeInTheDocument();
    // admin + write permission -> Download/Update/Delete actions available
    const modelRow = screen.getByRole('row', { name: /model1/ });
    expect(
      within(modelRow).getByRole('button', { name: 'Download' }),
    ).toBeInTheDocument();
    expect(
      within(modelRow).getByRole('link', { name: 'Update' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Users' }));
    const usersPanel = await screen.findByRole('tabpanel', { name: 'Users' });
    expect(
      within(usersPanel).getByRole('row', { name: 'User Permissions' }),
    ).toBeInTheDocument();
    await within(usersPanel).findByRole('row', { name: /admin/ });
  });

  it('switches namespace and reloads the tab data for the new namespace', async () => {
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await screen.findByRole('row', { name: /group1.*2/ });

    await user.click(screen.getByText('ns2'));
    await waitFor(() =>
      expect(screen.getByText('No Group Found')).toBeInTheDocument(),
    );

    // ns2's models endpoint legitimately returns an empty (but successful)
    // list, exercising the "no models" success branch (as opposed to an
    // error) of fetchModelsData
    await user.click(screen.getByRole('tab', { name: 'Models' }));
    await waitFor(() =>
      expect(screen.getByText('No Model Found')).toBeInTheDocument(),
    );
  });

  it('adding a namespace refreshes the namespace list', async () => {
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await screen.findByRole('tab', { name: 'Groups', selected: true });
    const getCallsBefore = axios.get.mock.calls.filter(
      ([url]) => url === 'testserver/namespaces/',
    ).length;

    await user.click(screen.getByRole('button', { name: /Add Namespace/ }));
    const dialog = await screen.findByRole('dialog');
    axios.post = vi.fn().mockResolvedValue({ status: 200 });
    await user.type(
      within(dialog).getByPlaceholderText('Namespace Name'),
      'ns3',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Add Namespace' }),
    );

    await waitFor(() => {
      const getCallsAfter = axios.get.mock.calls.filter(
        ([url]) => url === 'testserver/namespaces/',
      ).length;
      expect(getCallsAfter).toBeGreaterThan(getCallsBefore);
    });
  });

  it('adding a group refreshes the group table', async () => {
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await screen.findByRole('row', { name: /group1.*2/ });
    const getCallsBefore = axios.get.mock.calls.filter(
      ([url]) => url === 'testserver/namespaces/ns1/user-groups',
    ).length;

    await user.click(screen.getByRole('button', { name: /Add Group/ }));
    const dialog = await screen.findByRole('dialog');
    axios.post = vi.fn().mockResolvedValue({ status: 200 });
    await user.type(within(dialog).getByPlaceholderText('Group Label'), 'g2');
    await user.click(within(dialog).getByRole('button', { name: 'Add Group' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    await waitFor(() => {
      const getCallsAfter = axios.get.mock.calls.filter(
        ([url]) => url === 'testserver/namespaces/ns1/user-groups',
      ).length;
      expect(getCallsAfter).toBeGreaterThan(getCallsBefore);
    });
  });

  it('removing the selected namespace is only available to admins and refreshes the list', async () => {
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await screen.findByRole('row', { name: /group1.*2/ });

    const namespaceItem = screen.getByText('ns1').closest('li');
    const removeButton = within(namespaceItem).getByRole('button');
    await user.click(removeButton);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/remove the namespace/),
    ).toBeInTheDocument();

    axios.delete = vi.fn().mockResolvedValue({ status: 200 });
    // simulate the namespace actually being gone on the refetch that
    // follows a successful removal, so the previously-selected namespace
    // ("ns1") is no longer found and the component falls back to the first
    // remaining namespace
    axios.get.mockImplementation(
      defaultMock({
        'testserver/namespaces/': () =>
          Promise.resolve(
            namespacesResponse({
              data: [
                {
                  name: 'ns2',
                  permissions: [{ username: 'admin', permission: 7 }],
                  disk_quota: null,
                },
              ],
            }),
          ),
      }),
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove Namespace' }),
    );
    await waitFor(() => expect(axios.delete).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.queryByText('ns1')).toBeNull());
    expect(screen.getByText('ns2').closest('li')).toHaveClass('active');
  });

  it('hides admin/write-only actions for a read-only user', async () => {
    axios.get.mockImplementation(
      defaultMock({
        'testserver/namespaces/': () =>
          Promise.resolve(
            namespacesResponse({
              data: [
                {
                  name: 'ns1',
                  permissions: [{ username: 'reader', permission: 4 }],
                  disk_quota: null,
                },
              ],
            }),
          ),
      }),
    );

    render(<Models />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{ roles: ['user'], username: 'reader' }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });

    await screen.findByRole('tab', { name: 'Groups', selected: true });
    expect(screen.queryByRole('button', { name: /Add Namespace/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit Quota/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add Group/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Add Model/ })).toBeNull();
  });

  it('handles errors while loading groups, models and users for a tab', async () => {
    // the initial namespace list load must succeed, but the *subsequent*
    // call to the same endpoint (made when the Users tab loads) as well as
    // the groups/models endpoints should fail, to exercise each tab's catch
    // block
    let namespacesCallCount = 0;
    axios.get.mockImplementation((url) => {
      if (url === 'testserver/namespaces/') {
        namespacesCallCount++;
        if (namespacesCallCount === 1) {
          return Promise.resolve(namespacesResponse());
        }
      }
      return Promise.reject(new Error('boom'));
    });
    const user = userEvent.setup();
    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    await waitFor(() =>
      expect(screen.getByText('No Group Found')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('tab', { name: 'Models' }));
    await waitFor(() =>
      expect(screen.getByText('No Model Found')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('tab', { name: 'Users' }));
    await waitFor(() =>
      expect(screen.getByText('No User Found')).toBeInTheDocument(),
    );
  });

  it('renders a large number of namespaces without dropping any, supports filtering, and stays clickable', async () => {
    const user = userEvent.setup();
    const manyNamespaces = Array.from({ length: 50 }, (_, i) => ({
      name: `ns-${String(i).padStart(2, '0')}`,
      permissions: [{ username: 'admin', permission: 7 }],
      disk_quota: null,
    }));
    axios.get.mockImplementation(
      defaultMock({
        'testserver/namespaces/': () =>
          Promise.resolve(namespacesResponse({ data: manyNamespaces })),
      }),
    );

    render(<Models />, { wrapper: AllProvidersWrapperDefault });

    // all 50 namespaces should be rendered, not silently dropped/paginated
    await waitFor(() => {
      expect(screen.getAllByText(/^ns-\d{2}$/)).toHaveLength(50);
    });

    // a filter box only shows up once the list is long enough to need one,
    // and it should narrow the list down correctly
    const filterInput = screen.getByPlaceholderText('Filter namespaces...');
    await user.type(filterInput, 'ns-4');
    await waitFor(() => {
      expect(screen.getAllByText(/^ns-4\d$/)).toHaveLength(10);
    });
    expect(screen.queryByText('ns-00')).toBeNull();

    // the list should stay usable at this size: clicking a namespace still
    // selects it
    await user.click(screen.getByText('ns-42'));
    await waitFor(() => {
      expect(screen.getByText('ns-42').closest('li')).toHaveClass('active');
    });
  });
});
