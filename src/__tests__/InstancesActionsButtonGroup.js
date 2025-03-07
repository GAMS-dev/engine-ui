import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import InstancesActionsButtonGroup from '../components/InstancesActionsButtonGroup'

jest.mock('axios');

describe('InstancesActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders InstancesActionsButtonGroup correctly', async () => {
        render(<InstancesActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Update/));
        fireEvent.click(screen.getByRole("button", { name: 'Delete' }));
        expect(screen.getByText(/Are you sure you want to remove the instance/)).toBeInTheDocument()
    });

})
