import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import InstancePoolsActionsButtonGroup from '../components/InstancePoolsActionsButtonGroup';

vi.mock('axios');

describe('InstancePoolsActionsButtonGroup', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders InstancePoolsActionsButtonGroup correctly', async () => {
        render(<InstancePoolsActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await user.click(screen.getByRole("button", { name: 'Delete' }));

        expect(screen.getByText(/Are you sure you want to remove the instance/)).toBeInTheDocument()
    });

})
