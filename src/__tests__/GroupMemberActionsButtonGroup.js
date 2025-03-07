import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import GroupMemberActionsButtonGroup from '../components/GroupMemberActionsButtonGroup'

jest.mock('axios');

describe('GroupMemberActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders GroupMemberActionsButtonGroup correctly', async () => {
        render(<GroupMemberActionsButtonGroup namespace={{ permission: 10 }} roles={["admin"]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByText(/Remove/));
        expect(screen.getByRole('button', { name: "Delete" })).toBeInTheDocument()
    });

})
