import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserActionsButtonGroup from '../components/UserActionsButtonGroup'

describe('UserActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders UserActionsButtonGroup correctly', async () => {
        render(<UserActionsButtonGroup isAdmin={true} username='user1' me='admin' setUserToDelete={jest.fn()} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Delete'));
    });

})
