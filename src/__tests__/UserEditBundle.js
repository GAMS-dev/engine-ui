import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'
import { testDatax } from './utils/testData';
import axios from 'axios';

import UserEditBundle from '../components/UserEditBundle';

jest.mock('axios');

window.ResizeObserver = function () {
    return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    };
};

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));


// to forbid some axios requests
let isAuthorized = true;

describe('UserEditBundle', () => {

    beforeEach(() => {
        isAuthorized = true;

        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })

        // if the call is also dependent on params use: axios.get.mockImplementation((url, params) => {
        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
                case 'testserver/usage/':
                    return Promise.resolve({ status: 200, data: testDatax.test_single_job })
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
                    } else if (params.username === "admin" && isAuthorized) {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "admin",
                                    "roles": [
                                        "admin"
                                    ],
                                    "deleted": false,
                                    "old_username": null,
                                    "inviter_name": null,
                                    "invitation_time": null,
                                    "identity_provider": "gams_engine",
                                    "identity_provider_user_subject": "admin"
                                }
                            ]
                        })
                    } else if (params.username === "admin" && !isAuthorized) {
                        return Promise.reject({
                            response: {
                                status: 403,
                            }
                        })
                    } else if (params.username === "inviter1") {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "inviter1",
                                    "roles": [
                                        "inviter"
                                    ],
                                    "deleted": false,
                                    "old_username": "test",
                                    "inviter_name": "admin",
                                    "invitation_time": "2024-04-08T15:17:33.046930+00:00",
                                    "identity_provider": "something_else",
                                    "identity_provider_user_subject": "inviter1"
                                }
                            ]
                        })
                    } else if (params.username === "invited_by_inviter1") {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "invited_by_inviter1",
                                    "roles": [
                                        "inviter"
                                    ],
                                    "deleted": false,
                                    "old_username": "test",
                                    "inviter_name": "inviter1",
                                    "invitation_time": "2024-04-08T15:17:33.046930+00:00",
                                    "identity_provider": "gams_engine",
                                    "identity_provider_user_subject": "invited_by_inviter1"
                                }
                            ]
                        })
                    } else if (params.username === "notExisting") {
                        return Promise.resolve({
                            status: 200,
                            data: []
                        })
                    } else if (!params.username) {
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
                    } else {
                        return Promise.reject(new Error('not found'))
                    }

                case 'testserver/usage/pools/user1':
                    return Promise.resolve({
                        status: 200, data: {
                            "instance_pools_available": []
                        }
                    })
                case 'testserver/usage/instances/user1':
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
                case 'testserver/usage/instances/user1/default':
                    return Promise.resolve({
                        status: 200, data: {
                            "default_instance": null,
                            "default_inherited_from": null
                        }
                    })
                case 'testserver/usage/pools/admin':
                    return Promise.resolve({
                        status: 200, data: {
                            "instance_pools_available": []
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
                case 'testserver/usage/quota':
                    return Promise.resolve({ status: 200, data: [] })
                case 'testserver/users/inviters-providers/admin':
                    return Promise.resolve({
                        status: 200, data: [
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
                case 'testserver/namespaces/':
                    return Promise.resolve({
                        status: 200, data: [{
                            "name": "test_namespace",
                            "permissions": [
                                {
                                    "username": "admin",
                                    "permission": 7
                                }
                            ],
                            "disk_quota": null
                        }]
                    })
                case 'testserver/licenses/':
                    return Promise.resolve({
                        status: 200, data: [
                            {
                                "user": "user1",
                                "inherited_from": "admin",
                                "license": "string"
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

    it('provides expected UserSettingsContext obj to child elements', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
    });

    // ------------------- test path opens correct tab --------------------

    it('opens the correct tap, dependent on the given path: /usage/dashboard', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage/dashboard'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Aggregate/));
    });

    it('opens the correct tap, dependent on the given path: /usage/timeline', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage/timeline'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Show disaggregated data/));
    });

    it('opens the correct tap, dependent on the given path: /change_pass', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/change_pass'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Confirm/));
    });

    it('opens the correct tap, dependent on the given path: /instances', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/instances'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/raw resource/));
    });

    it('opens the correct tap, dependent on the given path: /quotas', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/quotas'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Parallel Quota/));
    });

    it('opens the correct tap, dependent on the given path: /identity_provider', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/identity_provider'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/gams_engine/));
    });

    it('opens the correct tap, dependent on the given path: /permissions', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/permissions'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Namespace/));
    });

    it('opens the correct tap, dependent on the given path: /licenses', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/licenses'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/GAMS/));
    });

    it('opens the correct tap, dependent on the given path: /invitees', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'admin' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/invitees'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/user1/));
    });


    // ------------------- test click opens correct tab --------------------

    it('opens the correct tap after click', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage/timeline'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Password/));
        fireEvent.click(screen.getByText(/Password/));
        await waitFor(() => screen.findByText(/Confirm/));

    });

    // ------------------- test only allowed tabs visible --------------------

    it('admin can see all options for user', async () => {
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Usage/));
        expect(screen.queryByText(/Password/)).toBeInTheDocument();
        expect(screen.queryByText(/License/)).toBeInTheDocument();
        expect(screen.queryByText(/Instances/)).toBeInTheDocument();
        expect(screen.queryByText(/Change Quota/)).toBeInTheDocument();
        expect(screen.queryByText(/Identity Provider/)).toBeInTheDocument();
        expect(screen.queryByText(/Permissions/)).toBeInTheDocument();
        // since now also for users
        expect(screen.queryByText('Invitees')).toBeInTheDocument();
    });

    it('admin can see fewer options on the own page', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'admin' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Usage/));
        expect(screen.queryByText(/Password/)).toBeInTheDocument();
        expect(screen.queryByText(/License/)).toBeInTheDocument();
        expect(screen.queryByText(/Instances/)).toBeInTheDocument();
        expect(screen.queryByText(/Change Quota/)).toBeNull();
        expect(screen.queryByText(/Identity Provider/)).toBeNull();
        expect(screen.queryByText(/Permissions/)).toBeNull();
        expect(screen.queryByText('Invitees')).toBeInTheDocument();
    });

    it('admin can see fewer options on inviter page with different provider', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'inviter1' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Usage/));
        expect(screen.queryByText(/Password/)).toBeNull();
        expect(screen.queryByText(/License/)).toBeInTheDocument();
        expect(screen.queryByText(/Instances/)).toBeInTheDocument();
        expect(screen.queryByText(/Change Quota/)).toBeInTheDocument();
        expect(screen.queryByText(/Identity Provider/)).toBeInTheDocument();
        expect(screen.queryByText(/Permissions/)).toBeInTheDocument();
        expect(screen.queryByText('Invitees')).toBeInTheDocument();
    });

    it('inviter only sees usage and invitees on his own page', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'inviter1' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'], username: "inviter1", roles: ["inviter"] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Remaining Quota/));
        expect(screen.queryByText(/Password/)).toBeNull();
        expect(screen.queryByText(/License/)).toBeNull();
        expect(screen.queryByText(/Instances/)).toBeNull();
        expect(screen.queryByText(/Change Quota/)).toBeNull();
        expect(screen.queryByText(/Identity Provider/)).toBeNull();
        expect(screen.queryByText(/Permissions/)).toBeNull();
        expect(screen.queryByText('Invitees')).toBeInTheDocument();
    });

    it('inviter can not see admin page', async () => {
        isAuthorized = false
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'admin' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'], username: "inviter1", roles: ["inviter"] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/You do not have permission to view information about user: admin./));
        expect(screen.queryByText(/Usage/)).toBeNull();
        expect(screen.queryByText(/Password/)).toBeNull();
        expect(screen.queryByText(/License/)).toBeNull();
        expect(screen.queryByText(/Instances/)).toBeNull();
        expect(screen.queryByText(/Change Quota/)).toBeNull();
        expect(screen.queryByText(/Identity Provider/)).toBeNull();
        expect(screen.queryByText(/Permissions/)).toBeNull();
        expect(screen.queryByText('Invitees')).toBeNull();
    });

    it('inviter can see user page for an invited inviter', async () => {
        isAuthorized = false
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'invited_by_inviter1' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'], username: "inviter1", roles: ["inviter"] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Usage/));
        expect(screen.queryByText(/Password/)).toBeInTheDocument();
        // inviter is not admin
        expect(screen.queryByText(/License/)).toBeNull();
        expect(screen.queryByText(/Instances/)).toBeInTheDocument();
        expect(screen.queryByText(/Change Quota/)).toBeInTheDocument();
        expect(screen.queryByText(/Identity Provider/)).toBeInTheDocument();
        expect(screen.queryByText(/Permissions/)).toBeInTheDocument();
        expect(screen.queryByText('Invitees')).toBeInTheDocument();
    });

    it('user only sees usage on his own page', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/dashboard'], username: "user1", roles: [] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Remaining Quota/));
        expect(screen.queryByText(/Password/)).toBeNull();
        expect(screen.queryByText(/License/)).toBeNull();
        expect(screen.queryByText(/Instances/)).toBeNull();
        expect(screen.queryByText(/Change Quota/)).toBeNull();
        expect(screen.queryByText(/Identity Provider/)).toBeNull();
        expect(screen.queryByText(/Permissions/)).toBeNull();
        expect(screen.queryByText('Invitees')).toBeNull();
    });

    it('user can not see admin page', async () => {
        isAuthorized = false
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'admin' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/dashboard'], username: "user1", roles: [] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/You do not have permission to view information about user: admin./));
        expect(screen.queryByText(/Usage/)).toBeNull();
        expect(screen.queryByText(/Password/)).toBeNull();
        expect(screen.queryByText(/License/)).toBeNull();
        expect(screen.queryByText(/Instances/)).toBeNull();
        expect(screen.queryByText(/Change Quota/)).toBeNull();
        expect(screen.queryByText(/Identity Provider/)).toBeNull();
        expect(screen.queryByText(/Permissions/)).toBeNull();
        expect(screen.queryByText('Invitees')).toBeNull();
    });

    it('user can not see page of non existing user', async () => {
        isAuthorized = false
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'notExisting' })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/dashboard'], username: "user1", roles: [] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/No data for user: notExisting found./));
        expect(screen.queryByText(/Usage/)).toBeNull();
        expect(screen.queryByText(/Password/)).toBeNull();
        expect(screen.queryByText(/License/)).toBeNull();
        expect(screen.queryByText(/Instances/)).toBeNull();
        expect(screen.queryByText(/Change Quota/)).toBeNull();
        expect(screen.queryByText(/Identity Provider/)).toBeNull();
        expect(screen.queryByText(/Permissions/)).toBeNull();
        expect(screen.queryByText('Invitees')).toBeNull();
    });

    // ------------------- test axios errrors --------------------

    it('handles errors while retrieving', async () => {
        axios.get.mockRejectedValue({
            response: {
                status: 400,
            }
        })
        render(<UserEditBundle />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ initialEntries: ['/usage'] }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });
        await waitFor(() => screen.findByText(/Failed to fetch user information./))
    })
})
