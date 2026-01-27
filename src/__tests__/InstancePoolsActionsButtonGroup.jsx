import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import InstancePoolsActionsButtonGroup from '../components/InstancePoolsActionsButtonGroup'

vi.mock('axios');

describe('InstancePoolsActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders InstancePoolsActionsButtonGroup correctly', async () => {
        render(<InstancePoolsActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByRole("button", { name: 'Delete' }));

        expect(screen.getByText(/Are you sure you want to remove the instance/)).toBeInTheDocument()
    });

})
