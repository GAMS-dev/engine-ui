import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'
import axios from 'axios';

import Job from '../components/Job'

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

describe('Job', () => {

    beforeEach(() => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ token: 'asd123' })

        axios.get.mockRejectedValue({
            status: 404,
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

    it('renders Job correctly', async () => {
        render(<Job />, {
            wrapper: AllProvidersWrapperDefault
        });
    });

    it('gives the correct error message if an invalid token is called', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ token: 'invalidToken123' })

        render(<Job />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Problems fetching job information. Error message: undefined/));
    });

    it('gives the correct error message if an invalid token is called also for hybercube', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ token: 'hc:invalidToken123' })

        render(<Job />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Problems fetching Hypercube job information. Error message: undefined/));
    });
})
