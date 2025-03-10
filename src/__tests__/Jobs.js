import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Jobs from '../components/Jobs'
import axios from 'axios';

jest.mock('axios');

describe('Jobs', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders Jobs correctly', async () => {
        render(<Jobs />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('New Job'));
    });

})
