import '@testing-library/jest-dom';
import {  render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import GroupMemberActionsButtonGroup from '../components/GroupMemberActionsButtonGroup';

vi.mock('axios');

describe('GroupMemberActionsButtonGroup', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders GroupMemberActionsButtonGroup correctly', async () => {
        render(<GroupMemberActionsButtonGroup namespace={{ permission: 10 }} roles={["admin"]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await user.click(screen.getByText(/Remove/));
        expect(screen.getByRole('button', { name: "Delete" })).toBeInTheDocument()
    });

})
