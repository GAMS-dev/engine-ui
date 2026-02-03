import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import WebhooksActionsButtonGroup from '../components/WebhooksActionsButtonGroup';

vi.mock('axios');


describe('WebhooksActionsButtonGroup', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders WebhooksActionsButtonGroup correctly', async () => {
        render(<WebhooksActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await user.click(screen.getByText(/Delete/));
        expect(screen.getByText(/Are you sure you want to remove the webhook /)).toBeInTheDocument();
    });

})
