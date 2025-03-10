import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Models from '../components/Models'
import axios from 'axios';

jest.mock('axios');

describe('Models', () => {
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
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Models correctly', async () => {
        render(<Models namespace={{ permission: 110 }} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Namespaces'));
    });

})
