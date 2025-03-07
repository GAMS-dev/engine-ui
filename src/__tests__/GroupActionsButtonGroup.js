import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import GroupActionsButtonGroup from '../components/GroupActionsButtonGroup'

jest.mock('axios');

describe('GroupActionsButtonGroup', () => {

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

    it('renders GroupActionsButtonGroup correctly', async () => {
        render(<GroupActionsButtonGroup namespace={{ permission: 10 }} roles={["admin"]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByText(/Show Members/));
        expect(screen.getByRole('button', { name: "Delete" })).toBeInTheDocument()
    });

})
