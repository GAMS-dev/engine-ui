import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import InstancePoolsActionsButtonGroup from '../components/InstancePoolsActionsButtonGroup'

jest.mock('axios');

describe('InstancePoolsActionsButtonGroup', () => {

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

    it('renders InstancePoolsActionsButtonGroup correctly', async () => {
        render(<InstancePoolsActionsButtonGroup isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AllProvidersWrapperDefault
        });
        fireEvent.click(screen.getByRole("button", { name: 'Delete' }));

        expect(screen.getByText(/Are you sure you want to remove the instance/)).toBeInTheDocument()
    });

})
