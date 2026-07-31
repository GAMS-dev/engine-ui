import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import UserChangeNameForm from '../components/UserChangeNameForm';

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
  { path: '/users/newuser1', element: <p>after submit went to newuser1</p> },
  { path: '/logout', element: <p>logged out</p> },
];

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault options={{ routes: routes }}>
    {children}
  </AllProvidersWrapperDefault>
);

describe('UserChangeNameForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.mocked(useParams).mockReturnValue({ user: 'user1' });
  });

  it('renders UserChangeNameForm correctly', async () => {
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Change Username of User: user1'));
  });

  it('shows a permission error when the current user is not an admin', async () => {
    vi.mocked(useParams).mockReturnValue({ user: 'user1' });
    render(<UserChangeNameForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault options={{ roles: ['user'] }}>
          {children}
        </AllProvidersWrapperDefault>
      ),
    });
    expect(
      screen.getByText(
        /You have no permission to change the username of user: user1./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Change Username of User: user1'),
    ).not.toBeInTheDocument();
  });

  it('shows a permission error when trying to change the admin user', async () => {
    vi.mocked(useParams).mockReturnValue({ user: 'admin' });
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(
      screen.getByText(
        /You have no permission to change the username of user: admin./,
      ),
    ).toBeInTheDocument();
  });

  it('sends the correct put request', async () => {
    axios.put.mockResolvedValueOnce({});
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapper,
    });
    const input = screen.getByPlaceholderText('New Username');
    await user.type(input, 'newuser1');
    expect(input).toHaveValue('newuser1');
    await user.click(screen.getByRole('button'));
    expect(axios.put).toBeCalledWith('testserver/users/username', {
      username: 'user1',
      new_username: 'newuser1',
    });
  });

  it('shows a success message and navigates when a different user is renamed', async () => {
    axios.put.mockResolvedValueOnce({});
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapper,
    });
    const input = screen.getByPlaceholderText('New Username');
    await user.type(input, 'newuser1');
    await user.click(screen.getByRole('button'));
    await waitFor(() => screen.findByText('after submit went to newuser1'));
  });

  it('navigates to logout when the current user renames themselves', async () => {
    vi.mocked(useParams).mockReturnValue({ user: 'user1' });
    axios.put.mockResolvedValueOnce({});
    render(<UserChangeNameForm />, {
      wrapper: ({ children }) => (
        <AllProvidersWrapperDefault
          options={{ routes: routes, username: 'user1', roles: ['admin'] }}
        >
          {children}
        </AllProvidersWrapperDefault>
      ),
    });
    const input = screen.getByPlaceholderText('New Username');
    await user.type(input, 'newuser1');
    await user.click(screen.getByRole('button'));
    await waitFor(() => screen.findByText('logged out'));
  });

  it('handles a generic error correctly', async () => {
    axios.put.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          message: 'something else than the username validation went wrong',
        },
      },
    });
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapper,
    });
    const input = screen.getByPlaceholderText('New Username');
    await user.type(input, 'newuser1');
    await user.click(screen.getByRole('button'));
    await waitFor(() =>
      screen.findByText(
        /Some error occurred while trying to change the name of the user: user1. Error message: something else than the username validation went wrong./,
      ),
    );
  });

  it('handles errors from the username validation correctly', async () => {
    axios.put.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'some error occurred',
          errors: {
            new_username: 'Username is already taken.',
          },
        },
      },
    });
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapper,
    });
    const input = screen.getByPlaceholderText('New Username');
    await user.type(input, 'newuser1');
    await user.click(screen.getByRole('button'));
    await waitFor(() => screen.findByText(/Username is already taken./));
    expect(
      screen.queryByText(
        /Some error occurred while trying to change the name of the user:/,
      ),
    ).toBeNull();
  });

  it('shows a generic error when a 400 response has no new_username error', async () => {
    axios.put.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'some error occurred',
          errors: {},
        },
      },
    });
    render(<UserChangeNameForm />, {
      wrapper: AllProvidersWrapper,
    });
    const input = screen.getByPlaceholderText('New Username');
    await user.type(input, 'newuser1');
    await user.click(screen.getByRole('button'));
    await waitFor(() =>
      screen.findByText(
        /Some error occurred while trying to change the name of the user: user1./,
      ),
    );
  });
});
