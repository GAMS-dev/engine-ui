import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserLink from '../components/UserLink';

describe('UserLink', () => {
  it('renders UserLink correctly', async () => {
    render(<UserLink user={{ username: 'admin', deleted: false }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(screen.getByText('admin').closest('a')).toHaveAttribute(
      'href',
      '/users/admin',
    );
  });

  it('shows me badge', async () => {
    render(<UserLink user={{ username: 'admin', deleted: false }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(screen.getByText('me')).toBeInTheDocument();
  });

  it('does not show me badge if hideMeBadge={true}', async () => {
    render(
      <UserLink
        user={{ username: 'admin', deleted: false }}
        hideMeBadge={true}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.queryByText('me')).toBeNull();
  });

  it('does not show me badge if not me', async () => {
    render(
      <UserLink
        user={{ username: 'user1', deleted: false }}
        hideMeBadge={true}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.queryByText('me')).toBeNull();
  });

  it('shows deleted and old name of user properly', async () => {
    render(
      <UserLink
        user={{ username: 'user321', deleted: true }}
        hideMeBadge={true}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    expect(screen.queryByText('deleted')).toBeNull();
    expect(screen.queryByText('user321')).toBeNull();
  });
});
