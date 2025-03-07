import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'
import axios from 'axios';
import UserChangePassForm from '../components/UserChangePassForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const routes = [{ path: '/users/user1', element: <p>after submit went back to usage</p> }]

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ routes: routes }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('UserChangePassForm', () => {

    beforeEach(() => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
    })

    const originalError = console.error
    beforeAll(() => {

        console.error = (...args) => {
            if (/Warning.*not wrapped in act/.test(args[0])) {
                return
            }
            originalError.call(console, ...args)
        }
    })

    afterAll(() => {
        console.error = originalError
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
        fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: 'newpassword1' } })
        fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: 'newpassword2' } })
        fireEvent.click(screen.getByRole("button"))
        expect(screen.queryByText(/The passwords you entered do not match. Please try again./)).toBeInTheDocument();
    });

    it('sends the correct put request', async () => {
        render(<UserChangePassForm />, {
            wrapper: AllProvidersWrapper
        });
        fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: 'new' } })
        fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: 'new' } })
        fireEvent.click(screen.getByRole("button"))
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
        fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: 'new' } })
        fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: 'new' } })
        fireEvent.click(screen.getByRole("button"))
        await waitFor(() => screen.findByText(/Some error occurred while trying to changing the password. Error message: something else than the password policy went wrong./));
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
        fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: 'new' } })
        fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: 'new' } })
        fireEvent.click(screen.getByRole("button"))
        await waitFor(() => screen.findByText(/Password must be at least 8 characters long./));
        expect(screen.queryByText(/Some error occurred while trying to changing the password. Error message:/)).toBeNull();
    });

    it('navigates correctly after submit', async () => {
        axios.put.mockResolvedValue({})
        render(<UserChangePassForm />
            , {
                wrapper: AllProvidersWrapper
            });
        fireEvent.change(screen.getByPlaceholderText("New password"), { target: { value: 'new' } })
        fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: 'new' } })
        fireEvent.click(screen.getByRole("button"))
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });
})
