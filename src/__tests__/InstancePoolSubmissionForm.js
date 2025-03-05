import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import { UserSettingsContext } from '../components/UserSettingsContext';

import InstancePoolSubmissionForm from '../components/InstancePoolSubmissionForm'
import axios from 'axios';

const AuthProviderWrapper = ({ children }) => (
    <UserSettingsContext.Provider value={[{
        quotaUnit: 'mults',
        tablePageLength: 10
    }, () => { }]}>
        <AuthContext.Provider value={[{ username: 'admin', roles: ['admin'], server: 'testserver' }]}>
            {children}
        </AuthContext.Provider>
    </UserSettingsContext.Provider>
);

jest.mock('axios');

describe('InstancePoolSubmissionForm', () => {

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

    it('renders InstancePoolSubmissionForm correctly', async () => {
        render(<InstancePoolSubmissionForm isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Pool Label/));
    });

})
