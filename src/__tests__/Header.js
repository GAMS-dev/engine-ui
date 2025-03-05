import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { ServerInfoContext } from '../ServerInfoContext';
import { AuthContext } from '../AuthContext';

import Header from '../components/Header'

const AuthProviderWrapper = ({ children }) => (
    <AuthContext.Provider value={[{ username: 'admin', roles: ['admin'], server: 'testserver' }]}>
        <ServerInfoContext.Provider value={[{ in_kubernetes: true }, () => { }]}>
            <MemoryRouter>
                {children}
            </MemoryRouter>
        </ServerInfoContext.Provider>
    </AuthContext.Provider>
);

jest.mock('axios');

describe('Header', () => {

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

    it('renders Header correctly', async () => {
        render(<Header isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AuthProviderWrapper
        });
        expect(screen.getByText('Perpetual license')).toBeInTheDocument()
    });

})
