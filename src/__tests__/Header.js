import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Header from '../components/Header'

jest.mock('axios');

describe('Header', () => {
    suppressActWarnings()

    it('renders Header correctly', async () => {
        render(<Header isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AllProvidersWrapperDefault
        });
        expect(screen.getByText('Perpetual license')).toBeInTheDocument()
    });

})
