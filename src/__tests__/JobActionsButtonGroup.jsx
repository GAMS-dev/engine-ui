import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import JobActionsButtonGroup from '../components/JobActionsButtonGroup'

vi.mock('axios');

describe('JobActionsButtonGroup', () => {

    it('renders JobActionsButtonGroup correctly', async () => {
        render(<JobActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Show/));
    });

})
