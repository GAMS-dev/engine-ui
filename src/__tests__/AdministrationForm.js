import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { ServerInfoContext } from "../ServerInfoContext";
import { ServerConfigContext } from "../ServerConfigContext";
import { AuthContext } from '../AuthContext';

import AdministrationForm from '../components/AdministrationForm'

const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <ServerConfigContext.Provider value={[{}, () => { }]}>
            <ServerInfoContext.Provider value={[{ in_kubernetes: true }, () => { }]}>
                <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>

                    {children}
                </AuthContext.Provider>
            </ServerInfoContext.Provider>
        </ServerConfigContext.Provider>
    </MemoryRouter>
);

jest.mock('axios');

describe('AdministrationForm', () => {

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

    it('renders AdministrationForm correctly', async () => {
        render(<AdministrationForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Administration/));
    });

})
