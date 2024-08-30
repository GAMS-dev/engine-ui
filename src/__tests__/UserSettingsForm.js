import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

import { UserSettingsContext } from '../components/UserSettingsContext'
import { ServerInfoContext } from '../ServerInfoContext'
import { AuthContext } from '../AuthContext'
import UserSettingsForm from '../components/UserSettingsForm'
import { ServerConfigContext } from '../ServerConfigContext'

const RouterWrapper = (options) => {
    const quotaUnit = options?.quotaUnit == null ? 'h' : options.quotaUnit
    const quotaConversionFactor =
        options?.quotaConversionFactor == null
            ? 3600
            : options.quotaConversionFactor
    const tablePageLength =
        options?.tablePageLength == null ? '10' : options.tablePageLength

    return ({ children }) => (
        <MemoryRouter>
            <AuthContext.Provider
                value={[{ server: 'http://localhost', roles: ['admin'] }]}
            >
                <ServerInfoContext.Provider value={[{}, () => {}]}>
                    <ServerConfigContext.Provider
                        value={[
                            options?.config ? options.config : {},
                            () => {},
                        ]}
                    >
                        <UserSettingsContext.Provider
                            value={[
                                {
                                    quotaConversionFactor:
                                        quotaConversionFactor,
                                    quotaUnit: quotaUnit,
                                    tablePageLength: tablePageLength,
                                },
                                () => {},
                            ]}
                        >
                            {children}
                        </UserSettingsContext.Provider>
                    </ServerConfigContext.Provider>
                </ServerInfoContext.Provider>
            </AuthContext.Provider>
        </MemoryRouter>
    )
}

describe('UserSettingsForm', () => {
    it('renders UserSettingsForm', () => {
        render(<UserSettingsForm />, {
            wrapper: RouterWrapper(),
        })
    })

    it('shows correct options for multiplier unit and table page length', async () => {
        render(<UserSettingsForm />, {
            wrapper: RouterWrapper(),
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
            wrapper: RouterWrapper(),
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
            wrapper: RouterWrapper(),
        })

        fireEvent.click(screen.getByText('Notifications'))
        await waitFor(() =>
            screen.getByText(
                'Push notifications require webhooks to be enabled.'
            )
        )
    })

    it('Cant edit notifications if push notifications not supported by browser', async () => {
        render(<UserSettingsForm />, {
            wrapper: RouterWrapper({ config: { webhook_access: 'ENABLED' } }),
        })

        fireEvent.click(screen.getByText('Notifications'))
        await waitFor(() =>
            screen.getByText(
                'Push notifications are not supported by your browser.'
            )
        )
    })
})
