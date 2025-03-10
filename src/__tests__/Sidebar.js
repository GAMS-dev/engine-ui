import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import Sidebar from '../components/Sidebar'

jest.mock('axios');

describe('Sidebar', () => {
    suppressActWarnings()

    it('renders Sidebar correctly', async () => {
        render(<Sidebar />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Jobs'));
    });

})
