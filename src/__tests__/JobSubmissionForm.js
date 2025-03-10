import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import JobSubmissionForm from '../components/JobSubmissionForm'
import axios from 'axios';

jest.mock('axios');

describe('JobSubmissionForm', () => {
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
                case 'testserver/usage/quota':
                    return Promise.resolve({ status: 200, data: [] })
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
                case 'testserver/namespaces/test_namespace':
                    return Promise.resolve({
                        status: 200, data: []
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders JobSubmissionForm correctly', async () => {
        render(<JobSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Use raw resource requests?/));
    });

})
