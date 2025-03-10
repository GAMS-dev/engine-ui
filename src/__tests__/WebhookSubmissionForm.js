import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import WebhookSubmissionForm from '../components/WebhookSubmissionForm'

jest.mock('axios');

describe('WebhookSubmissionForm', () => {
    suppressActWarnings()

    it('renders WebhookSubmissionForm correctly', async () => {
        render(<WebhookSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add new Webhook/));
    });

})
