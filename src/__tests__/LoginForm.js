import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import axios from 'axios';
import LoginForm from '../components/LoginForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));


const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <AuthContext.Provider value={[false, () => {}]}>
            {children}
        </AuthContext.Provider>
    </MemoryRouter>
);


describe('LoginForm', () => {

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

    it('displays maintenance alert correctly', async () => {
        axios.get.mockRejectedValueOnce({
            response: {
                status: 503,
                data: {
                    message: "Under maintenance",
                    maintenance_mode: true
                }
            }
        })
        render(<LoginForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/GAMS Engine is under maintenance./));
    });
})
