import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserInvitationForm from '../components/UserInvitationForm'
import axios from 'axios';

jest.mock('axios');


describe('UserInvitationForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
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
                            "default_instance": {
                                "label": "TestInstance",
                                "resource_type": "instance"
                            },
                            "default_inherited_from": "admin"
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders UserInvitationForm correctly', async () => {
        render(<UserInvitationForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Invite User'));
    });

})
