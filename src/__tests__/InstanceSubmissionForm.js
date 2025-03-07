import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import InstanceSubmissionForm from '../components/InstanceSubmissionForm'

jest.mock('axios');

describe('InstanceSubmissionForm', () => {
    suppressActWarnings()

    it('renders InstanceSubmissionForm correctly', async () => {
        render(<InstanceSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Instance Label/));
    });

})
