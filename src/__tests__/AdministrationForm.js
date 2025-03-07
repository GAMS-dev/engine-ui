import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import AdministrationForm from '../components/AdministrationForm'

jest.mock('axios');

describe('AdministrationForm', () => {

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

    it('renders AdministrationForm correctly', async () => {
        render(<AdministrationForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Administration/));
    });

})
