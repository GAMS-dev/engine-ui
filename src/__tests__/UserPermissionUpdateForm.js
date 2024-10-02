import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import { UserSettingsContext } from '../components/UserSettingsContext';
import axios from 'axios';
import UserPermissionUpdateForm from '../components/UserPermissionUpdateForm';
import { log } from 'console'
import userEvent from '@testing-library/user-event';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <Routes>
            <Route path='/users/user1/usage' element={<p>after submit went back to usage</p>} />
            <Route path='/'
                element={
                    <UserSettingsContext.Provider value={[{ _version: 1, quotaUnit: "$", multiplierUnit: "¢/s", quotaConversionFactor: 100, tablePageLength: "10" }]}>
                        <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>
                            {children}
                        </AuthContext.Provider>
                    </UserSettingsContext.Provider>
                } />
        </Routes>
    </MemoryRouter>
);

describe('UserPermissionUpdateForm', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
        axios.get.mockImplementation((url, paramsRaw) => {
            log(url)
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            log(params)
            switch (url) {
                case 'testserver/namespaces/':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                "name": "global",
                                "permissions": [
                                    {
                                        "username": "user2",
                                        "permission": 7
                                    },
                                    {
                                        "username": "user1",
                                        "permission": 5
                                    },
                                    {
                                        "username": "admin",
                                        "permission": 7
                                    }
                                ],
                                "disk_quota": null
                            },
                            {
                                "name": "namespace2",
                                "permissions": [
                                    {
                                        "username": "admin",
                                        "permission": 7
                                    }
                                ],
                                "disk_quota": null
                            }
                        ]
                    })
                case 'testserver/users/':
                    if (params?.username === "user1") {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "user1",
                                    "roles": [],
                                    "deleted": false,
                                    "old_username": "test1",
                                    "inviter_name": "admin",
                                    "invitation_time": "2024-04-15T12:45:39.866973+00:00",
                                    "identity_provider": "gams_engine",
                                    "identity_provider_user_subject": "user1"
                                }
                            ]
                        })
                    }
                    else {
                        return Promise.reject(new Error('not found'))
                    }
                case 'testserver/users/inviters-providers/admin':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                "name": "gams_engine",
                                "label": "Login",
                                "hidden": false,
                                "oauth2": null,
                                "oidc": null,
                                "is_main_identity_provider": true,
                                "is_ldap_identity_provider": false
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
        log('START')

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

    it('renders UserPermissionUpdateForm corectly', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AuthProviderWrapper
        });
    });

    it('renders UserPermissionUpdateForm corectly', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))

        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: 'Specify a role for the user' });
        await userEvent.selectOptions(roleSelectorEl, 'Inviter');

        fireEvent.click(screen.getByRole('button'))
        expect(axios.put).toBeCalledWith(
            'testserver/users/role',
            {"roles": ["inviter"], "username": "user1"}
        );
        await waitFor(() => screen.findByText(/after submit went back to usage/));

        // fireEvent.keyDown(document.getElementById('namespace'), {
        //     key: 'ArrowDown',
        // })

        // const namespaceEl = within(
        //     document.getElementById('namespace')
        // )
        // await waitFor(() => namespaceEl.getByText('namespace2'))
        // fireEvent.click(namespaceEl.getByText('namespace2'))
    });
})
