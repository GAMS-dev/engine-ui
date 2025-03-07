import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Cleanup from '../components/Cleanup'
import axios from 'axios';

jest.mock('axios');

describe('Cleanup', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/cleanup/results':
                    return Promise.resolve({
                        status: 200, data: {
                            "count": 0,
                            "next": null,
                            "previous": null,
                            "results": [],
                            "total_length": 0
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

    it('renders Cleanup correctly', async () => {
        render(<Cleanup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Total File Size/));
    });

})
