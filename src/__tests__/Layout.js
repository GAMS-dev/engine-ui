import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Layout from '../components/Layout'
import axios from 'axios';

jest.mock('axios');

describe('Layout', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/licenses/engine':
                    return Promise.resolve({
                        status: 200, data: {
                            "license": null,
                            "expiration_date": null,
                            "usi": "usiToken1234"
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Layout correctly', async () => {
        render(<Layout />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('No license'));
    });

})
