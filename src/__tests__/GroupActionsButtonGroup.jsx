import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import GroupActionsButtonGroup from '../components/GroupActionsButtonGroup'

vi.mock('axios');

describe('GroupActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders GroupActionsButtonGroup correctly', async () => {
        render(<GroupActionsButtonGroup namespace={{ permission: 10 }} roles={["admin"]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByText(/Show Members/));
        expect(screen.getByRole('button', { name: "Delete" })).toBeInTheDocument()
    });

})
