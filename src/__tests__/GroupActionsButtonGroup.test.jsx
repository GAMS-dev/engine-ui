import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import GroupActionsButtonGroup from '../components/GroupActionsButtonGroup'

vi.mock('axios');

describe('GroupActionsButtonGroup', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders GroupActionsButtonGroup correctly', async () => {
        render(<GroupActionsButtonGroup namespace={{ permission: 10 }} roles={["admin"]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await user.click(screen.getByText(/Show Members/));
        expect(screen.getByRole('button', { name: "Delete" })).toBeInTheDocument()
    });

})
