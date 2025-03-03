import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';

import GroupMemberActionsButtonGroup from '../components/GroupMemberActionsButtonGroup'

const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>
            {children}
        </AuthContext.Provider>
    </MemoryRouter>
);

jest.mock('axios');

describe('GroupMemberActionsButtonGroup', () => {

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

    it('renders GroupMemberActionsButtonGroup correctly', async () => {
        render(<GroupMemberActionsButtonGroup namespace={{ permission: 10 }} roles={["admin"]} />, {
            wrapper: AuthProviderWrapper
        });
        fireEvent.click(screen.getByText(/Remove/));
        expect(screen.getByRole('button', { name: "Delete" })).toBeInTheDocument()
    });

})
