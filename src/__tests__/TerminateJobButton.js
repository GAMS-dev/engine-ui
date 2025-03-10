import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import TerminateJobButton from '../components/TerminateJobButton'

jest.mock('axios');

describe('TerminateJobButton', () => {
    suppressActWarnings()

    it('renders TerminateJobButton correctly', async () => {
        render(<TerminateJobButton status={1} />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByText(/Cancel/));
        await waitFor(() => screen.findByText('Please Confirm'));
    });

})
