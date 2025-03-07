import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { suppressActWarnings } from './utils/testUtils';

import CleanupActionsButtonGroup from '../components/CleanupActionsButtonGroup'

jest.mock('axios');

describe('CleanupActionsButtonGroup', () => {
    suppressActWarnings()

    it('renders CleanupActionsButtonGroup correctly', async () => {
        render(<CleanupActionsButtonGroup />);
        await waitFor(() => screen.findByText(/Delete/));
    });

})
