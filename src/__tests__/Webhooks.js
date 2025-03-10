import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Webhooks from '../components/Webhooks'
import axios from 'axios';

jest.mock('axios');


describe('Webhooks', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/users/webhooks':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                "id": 0,
                                "username": "John",
                                "url": "https://www.example.com",
                                "content_type": "form",
                                "events": [
                                    "ALL"
                                ],
                                "parameterized_events": [
                                    {
                                        "event": "ALL",
                                        "parameters": [
                                            "string"
                                        ]
                                    }
                                ],
                                "recursive": true,
                                "insecure_ssl": true,
                                "created_at": "2021-08-04T17:10:15.000000+00:00"
                            }
                        ]
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Webhooks correctly', async () => {
        render(<Webhooks />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Webhooks'));
    });

})
