import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import InstanceSubmissionForm from '../components/InstanceSubmissionForm'

vi.mock('axios');

describe('InstanceSubmissionForm', () => {

    it('renders InstanceSubmissionForm correctly', async () => {
        render(<InstanceSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Instance Label/));
    });

})
