import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import axios from 'axios';
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserInstanceUpdateForm from '../components/UserInstanceUpdateForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

describe('UserInstanceUpdateForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })

        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            // user 2 inherits instances from user1 and default from admin
            // user1 doesn't
            switch (url) {
                case 'testserver/users/':
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
                    } else {
                        return Promise.reject(new Error('not found'))
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

    it('renders UserInstanceUpdateForm correctly', async () => {
        render(<UserInstanceUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });

        await waitFor(() => screen.findByText(/raw resource /));
    });

    it('renders UserInstanceUpdateForm correctly for user who inherits', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })

        render(<UserInstanceUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
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
            wrapper: AllProvidersWrapperDefault
        });

        await waitFor(() => screen.findByText(/Inherit instances from/));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Inherit instances from user1 (Test2, TestInstance)' }));
        expect(screen.queryByText("(Test2, TestInstance)")).toBeNull();
        expect(screen.queryByText("(TestInstance)")).toBeNull();
    });

    it('if default inherit checkboxes uncheck do not show inheritance information', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })

        render(<UserInstanceUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });

        await waitFor(() => screen.findByText(/Inherit instances from/));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Inherit default instance from admin me' }));
        expect(screen.queryByText("(Test2, TestInstance)")).toBeInTheDocument();
        expect(screen.queryByText("(TestInstance)")).toBeNull();
    });

})
