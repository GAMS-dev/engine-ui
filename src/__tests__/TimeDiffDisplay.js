import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import TimeDiffDisplay from '../components/TimeDiffDisplay'

jest.mock('axios');

describe('TimeDiffDisplay', () => {
    suppressActWarnings()

    it('renders TimeDiffDisplay correctly', async () => {
        render(<TimeDiffDisplay time={20000} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('5 hours, 33 minutes, 20 seconds'));
    });

})
