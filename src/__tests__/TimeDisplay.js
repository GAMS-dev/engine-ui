import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import TimeDisplay from '../components/TimeDisplay'

jest.mock('axios');

describe('TimeDisplay', () => {
    suppressActWarnings()

    it('renders TimeDisplay correctly', async () => {
        const oneYearAgo = new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()).toISOString();
        render(<TimeDisplay time={oneYearAgo} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('a year ago'));
    });

})
