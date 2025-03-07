import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import Header from '../components/Header'

jest.mock('axios');

describe('Header', () => {

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

    it('renders Header correctly', async () => {
        render(<Header isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AllProvidersWrapperDefault
        });
        expect(screen.getByText('Perpetual license')).toBeInTheDocument()
    });

})
