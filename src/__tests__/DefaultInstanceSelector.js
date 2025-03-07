import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import DefaultInstanceSelector from '../components/DefaultInstanceSelector'
import axios from 'axios';

jest.mock('axios');

describe('DefaultInstanceSelector', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
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
                            "default_inherited_from": "admin",
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

    it('renders DefaultInstanceSelector correctly', async () => {
        render(<DefaultInstanceSelector className={"form-group mt-3 mb-3"} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText("Default instance"));
    });

})
