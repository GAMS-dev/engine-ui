import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Usage from '../components/Usage'
import axios from 'axios';

jest.mock('axios');

describe('Usage', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/usage/':
                    return Promise.resolve({
                        status: 200,
                        data: {
                            "job_usage": [
                                {
                                    "username": "user1",
                                    "token": "token1234",
                                    "status": 0,
                                    "process_status": 0,
                                    "namespace": "string",
                                    "model": "string",
                                    "submitted": "2021-08-04T17:10:15.000000+00:00",
                                    "finished": "2021-08-04T17:10:15.000000+00:00",
                                    "times": [
                                        {
                                            "start": "2021-08-04T17:10:15.000000+00:00",
                                            "finish": "2021-08-05T17:10:15.000000+00:00"
                                        }
                                    ],
                                    "labels": {
                                        "cpu_request": 0,
                                        "memory_request": 0,
                                        "workspace_request": 0,
                                        "tolerations": [
                                            {
                                                "key": "string",
                                                "value": "string"
                                            }
                                        ],
                                        "node_selectors": [
                                            {
                                                "key": "string",
                                                "value": "string"
                                            }
                                        ],
                                        "resource_warning": "none",
                                        "instance": "instance_1",
                                        "multiplier": 3,
                                        "additionalProp1": "string",
                                        "additionalProp2": "string",
                                        "additionalProp3": "string"
                                    }
                                }
                            ],
                            "hypercube_job_usage": [
                            ],
                            "pool_usage": [
                            ]
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Usage correctly', async () => {
        render(<Usage userToEditRoles={['admin']} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Show Invitees?'));
    });

})
