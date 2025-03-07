import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import JobActionsButtonGroup from '../components/JobActionsButtonGroup'

jest.mock('axios');

describe('JobActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders JobActionsButtonGroup correctly', async () => {
        render(<JobActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Show/));
    });

})
