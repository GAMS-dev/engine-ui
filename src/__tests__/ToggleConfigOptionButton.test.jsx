import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import userEvent from '@testing-library/user-event';
import ToggleConfigOptionButton from '../components/ToggleConfigOptionButton';

vi.mock('axios');

describe('ToggleConfigOptionButton', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });
    it('renders ToggleConfigOptionButton correctly', async () => {
        render(<ToggleConfigOptionButton configKey='job_priorities_access' />, {
            wrapper: AllProvidersWrapperDefault
        });
        await user.click(screen.getByRole('button'));
        await waitFor(() => screen.findByText('Please Confirm'));
    });

})
