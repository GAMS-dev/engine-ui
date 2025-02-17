import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import { ServerInfoContext } from "../ServerInfoContext";
import axios from 'axios';
import { UserSettingsContext } from '../components/UserSettingsContext';

import UserInstanceUpdateForm from '../components/UserInstanceUpdateForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const AuthProviderWrapper = ({ children }) => (
    <UserSettingsContext.Provider value={[{ _version: 1, quotaUnit: "$", multiplierUnit: "¢/s", quotaConversionFactor: 100, tablePageLength: "10" }]}>
        <MemoryRouter>
            <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>
                {children}
            </AuthContext.Provider>
        </MemoryRouter>
    </UserSettingsContext.Provider>
);


describe('UserInstanceUpdateForm', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })

        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
                case 'testserver/users/':
                    // user 2 inherits instances from user1 and default from admin
                    // user1 doesn't
                    if (params?.username === "user1") {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "user1",
                                    "roles": [],
                                    "deleted": false,
                                    "inviter_name": "admin",
                                    "identity_provider": "gams_engine",
                                    "identity_provider_user_subject": "user1"
                                }
                            ]
                        })
                    } else if (params.username === "user2") {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "user2",
                                    "roles": [],
                                    "deleted": false,
                                    "inviter_name": "user1",
                                    "identity_provider": "gams_engine",
                                    "identity_provider_user_subject": "user1"
                                }
                            ]
                        })
                    }
                case 'testserver/usage/pools/user1':
                    return Promise.resolve({
                        status: 200, data: {
                            "instance_pools_available": []
                        }
                    })
                case 'testserver/usage/pools/user2':
                    return Promise.resolve({
                        status: 200, data: {
                            "instance_pools_available": []
                        }
                    })
                case 'testserver/usage/pools/admin':
                    return Promise.resolve({
                        status: 200, data: {
                            "instance_pools_available": []
                        }
                    })
                case 'testserver/usage/instances/user1':
                    return Promise.resolve({
                        status: 200, data: {
                            "instances_inherited_from": "user1",
                            "default_inherited_from": "user1",
                            "instances_available": [
                                {
                                    "label": "TestInstance",
                                    "cpu_request": 3,
                                    "memory_request": 100,
                                    "workspace_request": 100,
                                    "node_selectors": [],
                                    "tolerations": [],
                                    "multiplier": 3,
                                    "multiplier_idle": 3
                                },
                                {
                                    "label": "Test2",
                                    "cpu_request": 2,
                                    "memory_request": 100,
                                    "workspace_request": 100,
                                    "node_selectors": [],
                                    "tolerations": [],
                                    "multiplier": 6,
                                    "multiplier_idle": 6
                                }
                            ],
                            "default_instance": {
                                "label": "TestInstance",
                                "cpu_request": 3,
                                "memory_request": 100,
                                "workspace_request": 100,
                                "node_selectors": [],
                                "tolerations": [],
                                "multiplier": 3,
                                "multiplier_idle": 3
                            }
                        }
                    })
                case 'testserver/usage/instances/user2':
                    return Promise.resolve({
                        status: 200, data: {
                            "instances_inherited_from": "user1",
                            "default_inherited_from": "user1",
                            "instances_available": [
                                {
                                    "label": "TestInstance",
                                    "cpu_request": 3,
                                    "memory_request": 100,
                                    "workspace_request": 100,
                                    "node_selectors": [],
                                    "tolerations": [],
                                    "multiplier": 3,
                                    "multiplier_idle": 3
                                },
                                {
                                    "label": "Test2",
                                    "cpu_request": 2,
                                    "memory_request": 100,
                                    "workspace_request": 100,
                                    "node_selectors": [],
                                    "tolerations": [],
                                    "multiplier": 6,
                                    "multiplier_idle": 6
                                }
                            ],
                            "default_instance": {
                                "label": "TestInstance",
                                "cpu_request": 3,
                                "memory_request": 100,
                                "workspace_request": 100,
                                "node_selectors": [],
                                "tolerations": [],
                                "multiplier": 3,
                                "multiplier_idle": 3
                            }
                        }
                    })
                case 'testserver/usage/instances/user1/default':
                    return Promise.resolve({
                        status: 200, data: {
                            "default_instance": {
                                "label": "TestInstance",
                                "cpu_request": 3,
                                "memory_request": 100,
                                "workspace_request": 100,
                                "node_selectors": [],
                                "tolerations": [],
                                "multiplier": 3,
                                "multiplier_idle": 3
                            },
                            "default_inherited_from": "admin"
                        }
                    })
                case 'testserver/usage/instances/user2/default':
                    return Promise.resolve({
                        status: 200, data: {
                            "default_instance": {
                                "label": "TestInstance",
                                "cpu_request": 3,
                                "memory_request": 100,
                                "workspace_request": 100,
                                "node_selectors": [],
                                "tolerations": [],
                                "multiplier": 3,
                                "multiplier_idle": 3
                            },
                            "default_inherited_from": "admin"
                        }
                    })
                case 'testserver/usage/instances/admin':
                    return Promise.resolve({
                        status: 200, data: {
                            "instances_inherited_from": null,
                            "instances_available": [{
                                "label": "test",
                                "cpu_request": 1,
                                "memory_request": 100,
                                "workspace_request": 100,
                                "node_selectors": [],
                                "tolerations": [],
                                "multiplier": 1,
                                "multiplier_idle": 1
                            }]
                        }
                    })
                case 'testserver/usage/instances/admin/default':
                    return Promise.resolve({
                        status: 200, data: {
                            "default_instance": null,
                            "default_inherited_from": null
                        }
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

    it('renders UserInstanceUpdateForm correctly', async () => {
        render(<UserInstanceUpdateForm />, {
            wrapper: AuthProviderWrapper
        });

        await waitFor(() => screen.findByText(/raw resource /));
    });

    it('renders UserInstanceUpdateForm correctly for user who inherits', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })

        render(<UserInstanceUpdateForm />, {
            wrapper: AuthProviderWrapper
        });

        await waitFor(() => screen.findByText(/Inherit instances from/));
        expect(screen.getByText("Inherit instances from")).toBeInTheDocument();
        expect(screen.getByText("Inherit default instance from")).toBeInTheDocument();
        expect(screen.getByText("(Test2, TestInstance)")).toBeInTheDocument();
        expect(screen.getByText("(TestInstance)")).toBeInTheDocument();

        expect(screen.getByText('user1').closest('a')).toHaveAttribute('href', '/users/user1');
        expect(screen.getByText('admin').closest('a')).toHaveAttribute('href', '/users/admin');
    });

    it('if inherit checkboxes uncheck do not show inheritance information', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })

        render(<UserInstanceUpdateForm />, {
            wrapper: AuthProviderWrapper
        });

        await waitFor(() => screen.findByText(/Inherit instances from/));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Inherit instances from user1' }));
        expect(screen.queryByText("(Test2, TestInstance)")).toBeNull();
        expect(screen.queryByText("(TestInstance)")).toBeNull();
    });

    it('if default inherit checkboxes uncheck do not show inheritance information', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })

        render(<UserInstanceUpdateForm />, {
            wrapper: AuthProviderWrapper
        });

        await waitFor(() => screen.findByText(/Inherit instances from/));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Inherit default instance from admin me' }));
        expect(screen.queryByText("(Test2, TestInstance)")).toBeInTheDocument();
        expect(screen.queryByText("(TestInstance)")).toBeNull();
    });

})

