import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserSettingsForm from '../components/UserSettingsForm'

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ in_kubernetes: false }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('UserSettingsForm', () => {
    suppressActWarnings()

    it('renders UserSettingsForm', () => {
        render(<UserSettingsForm />, {
            wrapper: AllProvidersWrapper
        })
    })

    it('shows correct options for multiplier unit and table page length', async () => {
        render(<UserSettingsForm />, {
            wrapper: AllProvidersWrapper
        })
        fireEvent.keyDown(document.getElementById('selectMultUnit'), {
            key: 'ArrowDown',
        })
        expect(screen.queryAllByText('¢/s')).toHaveLength(2)
        expect(screen.queryAllByText('s/s')).toHaveLength(1)

        fireEvent.keyDown(document.getElementById('tablePageLength'), {
            key: 'ArrowDown',
        })
        expect(screen.queryAllByText('10')).toHaveLength(2)
        expect(screen.queryAllByText('20')).toHaveLength(1)
    })

    it('userSettingsContext is correctly updated when settings change', async () => {
        render(<UserSettingsForm />, {
            wrapper: AllProvidersWrapper,
        })

        fireEvent.keyDown(document.getElementById('selectMultUnit'), {
            key: 'ArrowDown',
        })
        await waitFor(() => screen.getByText('s/s'))
        fireEvent.click(screen.getByText('s/s'))
        expect(screen.queryAllByText('¢/s')).toHaveLength(0)
        expect(screen.queryAllByText('s/s')).toHaveLength(1)

        fireEvent.keyDown(document.getElementById('tablePageLength'), {
            key: 'ArrowDown',
        })
        await waitFor(() => screen.getByText('20'))
        fireEvent.click(screen.getByText('20'))
        expect(screen.queryAllByText('10')).toHaveLength(0)
        expect(screen.queryAllByText('20')).toHaveLength(1)
    })

    it('Cant edit notifications if webhooks not enabled', async () => {
        render(<UserSettingsForm />, {
            wrapper: AllProvidersWrapper,
        })

        fireEvent.click(screen.getByText('Notifications'))
        await waitFor(() =>
            screen.getByText(
                'Push notifications require webhooks to be enabled.'
            )
        )
    })

    it('Cant edit notifications if push notifications not supported by browser', async () => {
        render(<UserSettingsForm />,
            {
                wrapper: ({ children }) => (
                    <AllProvidersWrapperDefault options={{ in_kubernetes: false, serverConfig: { webhook_access: 'ENABLED' } }}>
                        {children}
                    </AllProvidersWrapperDefault>
                )
            }
        )

        fireEvent.click(screen.getByText('Notifications'))
        await waitFor(() =>
            screen.getByText(
                'Push notifications are not supported by your browser.'
            )
        )
    })
})
