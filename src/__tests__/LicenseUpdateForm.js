import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import { AllProvidersWrapperDefault } from './utils/testUtils'
import axios from 'axios';
import LicenseUpdateForm from '../components/LicenseUpdateForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));



const AuthProviderWrapperWithRoutes = ({ children }) => (
    <MemoryRouter>
        <Routes>
            <Route path='/users/user1' element={<p>after submit went back to usage</p>} />
            <Route path='/'
                element={
                    <AuthContext.Provider value={[{ server: 'testserver', username: 'admin', roles: ['admin'] }]}>
                        {children}
                    </AuthContext.Provider>
                } />
        </Routes>
    </MemoryRouter>
);

describe('LicenseUpdateForm', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
        axios.get.mockRejectedValue({
            response: {
                status: 404,
            }
        })
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

    it('renders LicenseUpdateForm correctly', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
    });

    it('shows error correctly if no license exists', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
    });

    it('shows error correctly if other problems occur in get', async () => {
        axios.get.mockRejectedValue({
            response: {
                data: {
                    message: 'some error'
                }
            }
        })
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Problems while retrieving user license. Error message: some error./));
    });

    it('shows the correct license (not inherited)', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            data: [{
                user: 'user1',
                inherited_from: 'user1',
                license: 'license12345'
            }]
        })
        axios.put.mockResolvedValue([])
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/license12345/));

    });

    it('shows inherited license ', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            data: [{
                user: 'user1',
                inherited_from: 'admin',
                license: 'license12345'
            }]
        })
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/User inherits the license from/));
        expect(screen.getByRole("link", { name: 'admin' })).toHaveAttribute(
            'href',
            '/users/admin'
        )
    });

    it('updates license correctly', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AuthProviderWrapperWithRoutes
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new license' } })
        fireEvent.click(screen.getByRole('button'))
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });

    it('shows error if empty license is given', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
        fireEvent.click(screen.getByRole('button'))
        await waitFor(() => screen.findByText(/Cannot submit empty license/));
    });

    it('handles errors of submit correctly', async () => {
        axios.put.mockRejectedValue({
            response: {
                status: 400,
                data: {
                    message: 'some error occurred'
                }
            }
        })
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new license' } })
        fireEvent.click(screen.getByRole('button'))
        await waitFor(() => screen.findByText(/An error occurred while updating user license. Error message: some error occurred./));
    });

    // CAN NOT TEST DELETE !!!!!!!!!!!!!!
    // due to error in jest when multiple submit buttons are used:
    // https://github.com/jsdom/jsdom/issues/3117

})
