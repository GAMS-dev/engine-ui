import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import axios from 'axios';
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Instances from '../components/Instances'

jest.mock('axios');

describe('Instances', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
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
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Instances correctly', async () => {
        render(<Instances />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/New Instance/));
    });

})
