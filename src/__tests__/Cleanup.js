import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { AuthContext } from '../AuthContext';
import { UserSettingsContext } from '../components/UserSettingsContext';

import Cleanup from '../components/Cleanup'
import axios from 'axios';

const AuthProviderWrapper = ({ children }) => (
    <UserSettingsContext.Provider value={[{
        quotaUnit: 'mults',
        tablePageLength: 10
    }, () => { }]}>
        <MemoryRouter>
            <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>
                {children}
            </AuthContext.Provider>
        </MemoryRouter>
    </UserSettingsContext.Provider>
);

jest.mock('axios');

describe('Cleanup', () => {

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/cleanup/results':
                    return Promise.resolve({
                        status: 200, data: {
                            "count": 0,
                            "next": null,
                            "previous": null,
                            "results": [],
                            "total_length": 0
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })

        // Mock the CancelToken source and axios get method
        const cancel = jest.fn();
        axios.isCancel = jest.fn();

        // You can also mock CancelToken source if needed
        axios.CancelToken.source = jest.fn(() => ({
            token: { cancel },
            cancel,
        }));
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

    it('renders Cleanup correctly', async () => {
        render(<Cleanup />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Total File Size/));
    });

})
