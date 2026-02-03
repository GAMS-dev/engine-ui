import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import UserChangePassForm from '../components/UserChangePassForm';
import { AllProvidersWrapperDefault } from './utils/testUtils';

vi.mock('axios');

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useParams: vi.fn(),
    }
})

import { useParams } from 'react-router-dom';

const routes = [{ path: '/users/user1', element: <p>after submit went back to usage</p> }]

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ routes: routes }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('UserChangePassForm', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();

        vi.mocked(useParams).mockReturnValue({ userToEdit: 'user1' })
    })

    it('renders UserChangePassForm corectly', () => {
        render(<UserChangePassForm />, {
            wrapper: AllProvidersWrapper
        });
    });

    it('throws error if confirm password differs', async () => {
        render(<UserChangePassForm />, {
            wrapper: AllProvidersWrapper
        });
        const inputNew = screen.getByPlaceholderText("New password");
        await user.type(inputNew, 'newpassword1');
        const inputConfirm = screen.getByPlaceholderText("Confirm password");
        await user.type(inputConfirm, 'newpassword2');
        await user.click(screen.getByRole("button"))
        expect(screen.queryByText(/The passwords you entered do not match. Please try again./)).toBeInTheDocument();
    });

    it('sends the correct put request', async () => {
        render(<UserChangePassForm />, {
            wrapper: AllProvidersWrapper
        });
        const inputNew = screen.getByPlaceholderText("New password");
        await user.type(inputNew, 'new');
        const inputConfirm = screen.getByPlaceholderText("Confirm password");
        await user.type(inputConfirm, 'new');
        await user.click(screen.getByRole("button")),
        expect(axios.put).toBeCalledWith(
            'testserver/users/', {
            username: "user1", password: "new" // pragma: allowlist secret
        });
    });

    it('handles errors correctly', async () => {
        axios.put.mockRejectedValueOnce({
            response: {
                data: {
                    message: "something else than the password policy went wrong"
                }
            }
        })
        render(<UserChangePassForm />, {
            wrapper: AllProvidersWrapper
        });
        const inputNew = screen.getByPlaceholderText("New password");
        await user.type(inputNew, 'new');
        const inputConfirm = screen.getByPlaceholderText("Confirm password");
        await user.type(inputConfirm, 'new');
        await user.click(screen.getByRole("button"));
        await waitFor(() => screen.findByText(/Some error occurred while trying to change the password. Error message: something else than the password policy went wrong./));
    });

    it('handles errors from the password policy correctly', async () => {
        axios.put.mockRejectedValueOnce({
            response: {
                status: 400,
                data: {
                    message: "some error occurred",
                    errors: {
                        password: "Password must be at least 8 characters long." // pragma: allowlist secret
                    }
                }
            }
        })
        render(<UserChangePassForm />, {
            wrapper: AllProvidersWrapper
        });
        const inputNew = screen.getByPlaceholderText("New password");
        await user.type(inputNew, 'new');
        const inputConfirm = screen.getByPlaceholderText("Confirm password");
        await user.type(inputConfirm, 'new');
        await user.click(screen.getByRole("button"));
        await waitFor(() => screen.findByText(/Password must be at least 8 characters long./));
        expect(screen.queryByText(/Some error occurred while trying to changing the password. Error message:/)).toBeNull();
    });

    it('navigates correctly after submit', async () => {
        axios.put.mockResolvedValue({})
        render(<UserChangePassForm />
            , {
                wrapper: AllProvidersWrapper
            });
        const inputNew = screen.getByPlaceholderText("New password");
        await user.type(inputNew, 'new');
        const inputConfirm = screen.getByPlaceholderText("Confirm password");
        await user.type(inputConfirm, 'new');
        await user.click(screen.getByRole("button"));
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });
})
