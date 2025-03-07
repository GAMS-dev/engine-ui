import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils'

import CreateAuthTokenForm from '../components/CreateAuthTokenForm'
import axios from 'axios';


jest.mock('axios');

describe('CreateAuthTokenForm', () => {

    beforeEach(() => {
        axios.post.mockImplementation((url) => {
            switch (url) {
                case 'testserver/auth':
                    return Promise.resolve({
                        status: 200, data: {
                            token: ""
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })

        // Mock the CancelToken source and axios get method
        const cancel = jest.fn();
        axios.isCancel = jest.fn();

        // You can also mock CancelToken source if needed
        axios.CancelToken.source = jest.fn(() => ({
            token: { cancel },
            cancel,
        }));
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

    it('renders CreateAuthTokenForm correctly', async () => {
        render(<CreateAuthTokenForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText("Expiration date"));
    });

})
