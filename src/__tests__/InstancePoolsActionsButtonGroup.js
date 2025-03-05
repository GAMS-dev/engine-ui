import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { ServerInfoContext } from '../ServerInfoContext';
import { AuthContext } from '../AuthContext';

import InstancePoolsActionsButtonGroup from '../components/InstancePoolsActionsButtonGroup'

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

describe('InstancePoolsActionsButtonGroup', () => {

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

    it('renders InstancePoolsActionsButtonGroup correctly', async () => {
        render(<InstancePoolsActionsButtonGroup isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AuthProviderWrapper
        });
        fireEvent.click(screen.getByRole("button", { name: 'Delete' }));

        expect(screen.getByText(/Are you sure you want to remove the instance/)).toBeInTheDocument()
    });

})
