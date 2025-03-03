import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import CleanupActionsButtonGroup from '../components/CleanupActionsButtonGroup'

jest.mock('axios');

describe('CleanupActionsButtonGroup', () => {

    const originalError = console.error
    beforeAll(() => {
        console.error = (...args) => {
            if (/Warning.*not wrapped in act/.test(args[0])) {
                return
            }
            originalError.call(console, ...args)
        }
    })

    afterAll(() => {
        console.error = originalError
    })

    it('renders CleanupActionsButtonGroup correctly', async () => {
        render(<CleanupActionsButtonGroup />);
        await waitFor(() => screen.findByText(/Delete/));
    });

})
