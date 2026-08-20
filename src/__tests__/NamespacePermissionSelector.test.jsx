import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import userEvent from '@testing-library/user-event';

import NamespacePermissionSelector from '../components/NamespacePermissionSelector';
import axios from 'axios';

vi.mock('axios');

describe('NamespacePermissionSelector', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();

    axios.get.mockImplementation((url) => {
      switch (url) {
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
  it('renders NamespacePermissionSelector correctly', async () => {
    render(
      <NamespacePermissionSelector
        namespacePermissions={[{ name: 'global', perm: 6, maxPerm: 7 }]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await waitFor(() => screen.findByText('Namespace'));
  });

  it('does not mutate the namespacePermissions prop array while sorting it for display', async () => {
    const namespacePermissions = [
      { name: 'zebra', perm: 6, maxPerm: 7 },
      { name: 'alpha', perm: 6, maxPerm: 7 },
    ];
    render(
      <NamespacePermissionSelector
        namespacePermissions={namespacePermissions}
      />,
      { wrapper: AllProvidersWrapperDefault },
    );
    await waitFor(() => screen.findByText('Namespace'));

    // the dropdown itself should still display alphabetically sorted
    const optionValues = screen
      .getAllByRole('option')
      .map((option) => option.value);
    expect(optionValues).toEqual(['alpha', 'zebra']);

    // but the array passed in by the parent (its own state) must be left
    // exactly as given - Array.prototype.sort mutates and returns the same
    // reference, which would otherwise reorder the parent's state without
    // it ever calling setState.
    expect(namespacePermissions.map((ns) => ns.name)).toEqual([
      'zebra',
      'alpha',
    ]);
  });

  it('should display the tooltip on hover', async () => {
    render(
      <NamespacePermissionSelector
        namespacePermissions={[{ name: 'global', perm: 6, maxPerm: 7 }]}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    const infoIcon = screen.getByText('Permissions').querySelector('svg');
    await user.hover(infoIcon);
    expect(
      screen.getByText(
        new RegExp(
          `Admin role required for namespace creation, deletion, and license management.` +
            `Read allows model data download.` +
            `Write allows model registration.` +
            `Execute runs registered model jobs.` +
            `Combine Write and Execute to run any model.`,
        ),
      ),
    ).toBeInTheDocument();
  });
});
