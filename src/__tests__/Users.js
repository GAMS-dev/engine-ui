import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Users from '../components/Users'
import axios from 'axios';

jest.mock('axios');


describe('Users', () => {
    suppressActWarnings()

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
                case 'testserver/users/invitation':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                "token": "41f6faa9-728b-4fb6-8e85-c96386dd2246",
                                "inviter_name": "admin",
                                "username": "user1",
                                "created": "2025-01-06T10:42:05.345218+00:00",
                                "used": true,
                                "roles": [
                                    "inviter"
                                ],
                                "permissions": [],
                                "quota": {
                                    "parallel_quota": null,
                                    "volume_quota": null,
                                    "disk_quota": null
                                },
                                "user_groups": [],
                                "gams_license": null,
                                "identity_provider": "gams_engine",
                                "identity_provider_user_subject": null,
                                "invitable_identity_providers": [
                                    "gams_engine"
                                ]
                            }
                        ]
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Users correctly', async () => {
        render(<Users />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Users'));
    });

})
