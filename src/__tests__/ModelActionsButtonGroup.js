import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import ModelActionsButtonGroup from '../components/ModelActionsButtonGroup'

jest.mock('axios');

describe('ModelActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders ModelActionsButtonGroup correctly', async () => {
        render(<ModelActionsButtonGroup namespace={{ permission: 110 }} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Download'));
        fireEvent.click(screen.getByText(/Delete/));
        expect(screen.getByText(/Are you sure you want to delete the model:/)).toBeInTheDocument();
    });

})
