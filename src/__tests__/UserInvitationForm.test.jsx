import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserInvitationForm from '../components/UserInvitationForm';
import axios from 'axios';

vi.mock('axios');

const namespacesHandler = () =>
  Promise.resolve({
    status: 200,
    data: [
      {
        name: 'test_namespace',
        permissions: [{ username: 'admin', permission: 7 }],
        disk_quota: null,
      },
    ],
  });

const oneIdentityProviderHandler = () =>
  Promise.resolve({
    status: 200,
    data: [
      {
        name: 'gams_engine',
        label: 'Login',
        hidden: false,
        oauth2: null,
        oidc: null,
        is_main_identity_provider: true,
        is_ldap_identity_provider: false,
      },
    ],
  });

const twoIdentityProvidersHandler = () =>
  Promise.resolve({
    status: 200,
    data: [
      {
        name: 'gams_engine',
        label: 'Login',
        hidden: false,
        oauth2: null,
        oidc: null,
        is_main_identity_provider: true,
        is_ldap_identity_provider: false,
      },
      {
        name: 'company_ldap',
        label: 'Company LDAP',
        hidden: false,
        oauth2: null,
        oidc: null,
        is_main_identity_provider: false,
        is_ldap_identity_provider: true,
      },
    ],
  });

const noIdentityProvidersHandler = () =>
  Promise.resolve({ status: 200, data: [] });

const poolsHandler = () =>
  Promise.resolve({ status: 200, data: { instance_pools_available: [] } });

const instancesHandler = () =>
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
  });

const defaultInstanceHandler = () =>
  Promise.resolve({
    status: 200,
    data: {
      default_instance: { label: 'TestInstance', resource_type: 'instance' },
      default_inherited_from: 'admin',
    },
  });

const buildGetMock = (overrides = {}) => {
  const handlers = {
    'testserver/namespaces/': namespacesHandler,
    'testserver/users/inviters-providers/admin': oneIdentityProviderHandler,
    'testserver/usage/pools/admin': poolsHandler,
    'testserver/usage/instances/admin': instancesHandler,
    'testserver/usage/instances/admin/default': defaultInstanceHandler,
    ...overrides,
  };
  return (url) =>
    handlers[url] ? handlers[url]() : Promise.reject(new Error('not found'));
};

const renderForm = (options = {}) =>
  render(<UserInvitationForm />, {
    wrapper: ({ children }) => (
      <AllProvidersWrapperDefault options={options}>
        {children}
      </AllProvidersWrapperDefault>
    ),
  });

describe('UserInvitationForm', () => {
  beforeEach(() => {
    axios.get.mockImplementation(buildGetMock());
  });

  it('renders UserInvitationForm correctly', async () => {
    render(<UserInvitationForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Invite User'));
  });

  it('shows an error when fetching instance data fails', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/usage/pools/admin': () =>
          Promise.reject(new Error('pools down')),
      }),
    );
    renderForm();
    await screen.findByText(/An error occurred fetching instances/);
    expect(screen.queryByText('Invite User')).toBeNull();
  });

  it('shows an error when fetching namespaces fails', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/namespaces/': () =>
          Promise.reject(new Error('namespaces down')),
      }),
    );
    renderForm();
    await screen.findByText(/Problems while retrieving namespaces/);
  });

  it('shows an error when fetching identity providers fails', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/users/inviters-providers/admin': () =>
          Promise.reject(new Error('providers down')),
      }),
    );
    renderForm();
    await screen.findByText(/Problems while retrieving identity providers/);
  });

  it('shows the Assign License option for admins and toggles the textarea', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Invite User');

    const assignLicense = screen.getByLabelText('Assign License?');
    expect(screen.queryByLabelText('GAMS License for User')).toBeNull();
    await user.click(assignLicense);
    expect(screen.getByLabelText('GAMS License for User')).toBeInTheDocument();
    await user.click(assignLicense);
    expect(screen.queryByLabelText('GAMS License for User')).toBeNull();
  });

  it('hides the namespace/quota/instance sections for admin invitees', async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Invite User');

    await user.selectOptions(screen.getByLabelText(/Select a role/), 'admin');
    expect(screen.queryByLabelText('Assign Quotas?')).toBeNull();
    expect(screen.queryByLabelText('assignInstances')).toBeNull();
    expect(screen.queryByLabelText('Read')).toBeNull();
    expect(screen.getByLabelText('Assign License?')).toBeInTheDocument();
  });

  it('shows an inline error and disables submit when there are no identity providers to assign as an inviter', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/users/inviters-providers/admin': noIdentityProvidersHandler,
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Invite User');

    await user.selectOptions(screen.getByLabelText(/Select a role/), 'inviter');
    expect(
      screen.getByText(
        /no available identity providers you could give this user/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Invitation' }),
    ).toBeDisabled();
  });

  it('requires at least one selected identity provider when inviting an "inviter"', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/users/inviters-providers/admin':
          twoIdentityProvidersHandler,
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Invite User');

    await user.selectOptions(screen.getByLabelText(/Select a role/), 'inviter');
    const allowedSelect = screen.getByLabelText(
      'Identity providers user is allowed to invite with',
    );
    // clear the default selection (all providers pre-selected)
    await user.click(allowedSelect);
    await user.keyboard('{Backspace}{Backspace}');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await screen.findByText(/Please select at least one identity provider/);
  });

  it('shows the ldap subject field only for ldap identity providers', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/users/inviters-providers/admin':
          twoIdentityProvidersHandler,
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Invite User');

    expect(screen.queryByPlaceholderText('LDAP login name')).toBeNull();

    const providerSelect = screen.getByLabelText('Identity provider');
    await user.click(providerSelect);
    await user.type(providerSelect, 'Company{enter}');

    expect(screen.getByPlaceholderText('LDAP login name')).toBeInTheDocument();

    await user.click(providerSelect);
    // the select options are keyed by the provider's raw name, not its
    // display label
    await user.type(providerSelect, 'gams_engine{enter}');
    expect(screen.queryByPlaceholderText('LDAP login name')).toBeNull();
  });

  it('lets the user select instances and shows a confirmation dialog when none are selected', async () => {
    const user = userEvent.setup();
    axios.post = vi.fn().mockResolvedValue({
      status: 200,
      data: { invitation_token: 'ABC123' },
    });
    renderForm();
    await screen.findByText('Invite User');

    const inheritCheckbox = screen.getByLabelText(
      'Allowed to use any instance/raw resource requests',
    );
    // unchecking reveals the explicit instance selectors
    await user.click(inheritCheckbox);
    expect(
      screen.getByLabelText('Instances user is allowed to use'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Default Instance')).toBeInTheDocument();

    // deselect the only available instance
    const instancesSelect = screen.getByLabelText(
      'Instances user is allowed to use',
    );
    await user.click(instancesSelect);
    await user.keyboard('{Backspace}');
    expect(screen.queryByLabelText('Default Instance')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/invite a user without instances/),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    await screen.findByText(/Your invitation code is/);
  });

  it('submits successfully and allows copying the invitation code to the clipboard', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: true,
    });

    // userEvent.setup() installs its own real (non-mock) navigator.clipboard
    // stub, so we exercise it directly rather than trying to spy on it
    const user = userEvent.setup();
    axios.post = vi.fn().mockResolvedValue({
      status: 200,
      data: { invitation_token: 'ABC123' },
    });
    renderForm();
    await screen.findByText('Invite User');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await screen.findByText(/Your invitation code is/);
    expect(screen.getByText('ABC123')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe('ABC123');
  });

  it('does not render the copy-to-clipboard button in an insecure context', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: false,
    });

    const user = userEvent.setup();
    axios.post = vi.fn().mockResolvedValue({
      status: 200,
      data: { invitation_token: 'ABC123' },
    });
    renderForm();
    await screen.findByText('Invite User');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));
    await screen.findByText(/Your invitation code is/);
    expect(
      screen.queryByRole('button', { name: 'Copy to clipboard' }),
    ).toBeNull();
  });

  it('shows field-level and general errors returned by the server', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/users/inviters-providers/admin':
          twoIdentityProvidersHandler,
      }),
    );
    const user = userEvent.setup();
    axios.post = vi.fn().mockRejectedValue({
      response: {
        data: {
          errors: {
            identity_provider_user_subject: 'This subject is already taken.',
          },
        },
      },
    });
    renderForm();
    await screen.findByText('Invite User');

    const providerSelect = screen.getByLabelText('Identity provider');
    await user.click(providerSelect);
    await user.type(providerSelect, 'Company{enter}');
    await user.type(screen.getByPlaceholderText('LDAP login name'), 'jdoe');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await screen.findByText('Problems creating invitation code.');
    expect(
      screen.getByText('This subject is already taken.'),
    ).toBeInTheDocument();
  });

  it('shows a generic error message when the request fails without a structured response', async () => {
    const user = userEvent.setup();
    axios.post = vi.fn().mockRejectedValue(new Error('network down'));
    renderForm();
    await screen.findByText('Invite User');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await screen.findByText(
      /An error occurred while creating an invitation code/,
    );
  });

  it('shows a fallback error message when the response is missing an invitation token', async () => {
    const user = userEvent.setup();
    axios.post = vi.fn().mockResolvedValue({ status: 200, data: {} });
    renderForm();
    await screen.findByText('Invite User');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await screen.findByText(
      'An error occurred while creating an invitation code. Please try again later.',
    );
  });

  it('toggles the quota selector on and off', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/usage/quota': () =>
          Promise.resolve({ status: 200, data: [] }),
      }),
    );
    const user = userEvent.setup();
    renderForm();
    await screen.findByText('Invite User');

    const assignQuotas = screen.getByLabelText('Assign Quotas?');
    await user.click(assignQuotas);
    await screen.findByLabelText(/Parallel Quota/);
    await user.click(assignQuotas);
    expect(screen.queryByLabelText(/Parallel Quota/)).toBeNull();
  });

  it('submits namespace permissions, groups and quota values', async () => {
    axios.get.mockImplementation(
      buildGetMock({
        'testserver/usage/quota': () =>
          Promise.resolve({ status: 200, data: [] }),
        'testserver/namespaces/test_namespace/user-groups': () =>
          Promise.resolve({
            status: 200,
            data: [
              {
                label: 'group1',
                created_at: '2021-08-04T17:10:15.000000+00:00',
                created_by: { username: 'admin', deleted: false },
                members: [],
              },
            ],
          }),
      }),
    );
    const user = userEvent.setup();
    axios.post = vi.fn().mockResolvedValue({
      status: 200,
      data: { invitation_token: 'ABC123' },
    });
    renderForm();
    await screen.findByText('Invite User');

    await user.click(screen.getByLabelText('Write'));

    const groupsSelect = await screen.findByLabelText('User Groups');
    await user.click(groupsSelect);
    await user.type(groupsSelect, 'group1{enter}');

    await user.click(screen.getByLabelText('Assign Quotas?'));
    const parallelInput = await screen.findByLabelText(/Parallel Quota/);
    await user.type(parallelInput, '3');
    await user.type(screen.getByLabelText(/Volume Quota/), '4');
    await user.type(screen.getByLabelText(/Disk Space Quota/), '5');

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const submittedForm = axios.post.mock.calls[0][1];
    expect(submittedForm.get('namespace_permissions')).toBe('2@test_namespace');
    expect(submittedForm.get('user_groups')).toBe('group1@test_namespace');
    expect(submittedForm.get('parallel_quota')).toBe('3');
    // volume is entered in the display currency and stored converted
    // (quotaConversionFactor = 100 for the default '$' unit)
    expect(submittedForm.get('volume_quota')).toBe('400');
    // disk is entered in MB and stored converted to bytes
    expect(submittedForm.get('disk_quota')).toBe('5000000');
  });

  it('submits an explicitly assigned default instance when not inheriting', async () => {
    const user = userEvent.setup();
    axios.post = vi.fn().mockResolvedValue({
      status: 200,
      data: { invitation_token: 'ABC123' },
    });
    renderForm();
    await screen.findByText('Invite User');

    await user.click(
      screen.getByLabelText(
        'Allowed to use any instance/raw resource requests',
      ),
    );
    // the only available instance ("test") stays selected as the default
    expect(screen.getByLabelText('Default Instance')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create Invitation' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const submittedForm = axios.post.mock.calls[0][1];
    expect(submittedForm.get('default_label')).toBe('test');
    expect(submittedForm.get('labels')).toBe('test');
  });
});
