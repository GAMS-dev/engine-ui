import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import WebhookSubmissionForm from '../components/WebhookSubmissionForm'

vi.mock('axios');

describe('WebhookSubmissionForm', () => {

    it('renders WebhookSubmissionForm correctly', async () => {
        render(<WebhookSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add new Webhook/));
    });

})
