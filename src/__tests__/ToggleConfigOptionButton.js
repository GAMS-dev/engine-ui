import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import ToggleConfigOptionButton from '../components/ToggleConfigOptionButton'

jest.mock('axios');

describe('ToggleConfigOptionButton', () => {
    suppressActWarnings()

    it('renders ToggleConfigOptionButton correctly', async () => {
        render(<ToggleConfigOptionButton configKey='job_priorities_access' />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByRole('button'));
        await waitFor(() => screen.findByText('Please Confirm'));
    });

})
