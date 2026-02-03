import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import ModelActionsButtonGroup from '../components/ModelActionsButtonGroup';

vi.mock('axios');

describe('ModelActionsButtonGroup', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders ModelActionsButtonGroup correctly', async () => {
        render(<ModelActionsButtonGroup namespace={{ permission: 110 }} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Download'));
        await user.click(screen.getByText(/Delete/));
        expect(screen.getByText(/Are you sure you want to delete the model:/)).toBeInTheDocument();
    });

})
