import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import { UserSettingsContext } from '../components/UserSettingsContext';

import GroupMembers from '../components/GroupMembers'
import axios from 'axios';

const AuthProviderWrapper = ({ children }) => (
    <UserSettingsContext.Provider value={[{
        quotaUnit: 'mults',
        tablePageLength: 10
    }, () => { }]}>
        <MemoryRouter>
            <AuthContext.Provider value={[{ username: 'admin', roles: ['admin'], server: 'testserver' }]}>
                {children}
            </AuthContext.Provider>
        </MemoryRouter>
    </UserSettingsContext.Provider>
);

jest.mock('axios');

describe('GroupMembers', () => {

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/users/':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'username': 'user1',
                                'roles': [],
                                'deleted': false,
                                'old_username': 'test1',
                                'inviter_name': 'admin',
                                'invitation_time': '2024-04-15T12:45:39.866973+00:00',
                                'identity_provider': 'gams_engine',
                                'identity_provider_user_subject': 'user1'
                            }
                        ]
                    })
                case 'testserver/namespaces/global/user-groups':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'label': 'string',
                                'created_at': '2021-08-04T17:10:15.000000+00:00',
                                'created_by': {
                                    'username': 'string',
                                    'deleted': true,
                                    'old_username': 'string'
                                },
                                'owned_by': 'string',
                                'members': [
                                    {
                                        'username': 'string',
                                        'added_at': '2021-08-04T17:10:15.000000+00:00',
                                        'added_by': {
                                            'username': 'string',
                                            'deleted': true,
                                            'old_username': 'string'
                                        }
                                    }
                                ]
                            }
                        ]
                    })
                default:
                    return Promise.reject(new Error('not found'))
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

    it('renders GroupMembers correctly', async () => {
        render(<GroupMembers namespace='global' label='group1' />, {
            wrapper: AuthProviderWrapper
        });
        expect(screen.getByRole('row', { name: 'Username Added Added By Actions' })).toBeInTheDocument()
    });

})
