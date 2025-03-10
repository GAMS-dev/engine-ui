import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import WebhooksActionsButtonGroup from '../components/WebhooksActionsButtonGroup'

jest.mock('axios');


describe('WebhooksActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders WebhooksActionsButtonGroup correctly', async () => {
        render(<WebhooksActionsButtonGroup />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByText(/Delete/));
        expect(screen.getByText(/Are you sure you want to remove the webhook /)).toBeInTheDocument();
    });

})
