import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import InstancesActionsButtonGroup from '../components/InstancesActionsButtonGroup';

vi.mock('axios');

describe('InstancesActionsButtonGroup', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders InstancesActionsButtonGroup correctly', async () => {
        render(<InstancesActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Update/));
        await user.click(screen.getByRole("button", { name: 'Delete' }));
        expect(screen.getByText(/Are you sure you want to remove the instance/)).toBeInTheDocument()
    });

})
