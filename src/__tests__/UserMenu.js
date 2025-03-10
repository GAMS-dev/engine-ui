import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserMenu from '../components/UserMenu'

describe('UserMenu', () => {
    suppressActWarnings()

    it('renders UserMenu correctly', async () => {
        render(<UserMenu />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Usage')).toBeInTheDocument()
    });

})
