import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

import { ServerInfoContext } from '../ServerInfoContext'
import { AuthContext } from '../AuthContext'
import Sidebar from '../components/Sidebar'
import { ServerConfigContext } from '../ServerConfigContext'

const RouterWrapper = (options) => {
    return ({ children }) => (
        <MemoryRouter>
            <AuthContext.Provider
                value={[{ server: 'http://localhost', roles: options?.roles }]}
            >
                <ServerInfoContext.Provider
                    value={[options?.info ? options.info : {}, () => {}]}
                >
                    <ServerConfigContext.Provider
                        value={[
                            options?.config ? options.config : {},
                            () => {},
                        ]}
                    >
                        {children}
                    </ServerConfigContext.Provider>
                </ServerInfoContext.Provider>
            </AuthContext.Provider>
        </MemoryRouter>
    )
}

describe('Sidebar', () => {
    it('renders Sidebar', () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper(),
        })
    })
    it('users see Pools section if enabled', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                config: { instance_pool_access: 'ENABLED' },
                info: { in_kubernetes: true },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeInTheDocument()
    })
    it('users cant see Pools section if disabled', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                config: { instance_pool_access: 'DISABLED' },
                info: { in_kubernetes: true },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeNull()
    })
    it('users cant see Pools section if inviter only', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                config: {
                    instance_pool_access: 'INVITER_ONLY',
                    webhook_access: 'ENABLED',
                },
                info: { in_kubernetes: true },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeNull()
        expect(
            screen.queryByRole('link', {
                name: /administration/i,
            })
        ).toBeNull()
        expect(
            screen.queryByRole('link', {
                name: /webhooks/i,
            })
        ).toBeInTheDocument()
    })
    it('admins see Pools section if disabled', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                roles: ['admin'],
                config: {
                    instance_pool_access: 'DISABLED',
                    webhook_access: 'DISABLED',
                },
                info: { in_kubernetes: true },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', {
                name: /webhooks/i,
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', {
                name: /administration/i,
            })
        ).toBeInTheDocument()
    })
    it('inviters cannot see Pools section if disabled', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                roles: ['inviter'],
                config: {
                    instance_pool_access: 'DISABLED',
                    webhook_access: 'DISABLED',
                },
                info: { in_kubernetes: true },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeNull()
        expect(
            screen.queryByRole('link', {
                name: /webhooks/i,
            })
        ).toBeNull()
        expect(
            screen.queryByRole('link', {
                name: /administration/i,
            })
        ).toBeNull()
    })
    it('inviters can see Pools section if inviter_only', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                roles: ['inviter'],
                config: {
                    instance_pool_access: 'INVITER_ONLY',
                    webhook_access: 'ENABLED',
                },
                info: { in_kubernetes: true },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', {
                name: /webhooks/i,
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', {
                name: /administration/i,
            })
        ).toBeNull()
    })
    it('admins cannot see Pools section if not in Kubernetes', async () => {
        render(<Sidebar />, {
            wrapper: RouterWrapper({
                roles: ['admin'],
                config: {
                    instance_pool_access: 'DISABLED',
                    webhook_access: 'DISABLED',
                },
            }),
        })
        await waitFor(() => screen.getByText('Jobs'))
        expect(
            screen.queryByRole('link', {
                name: /pools/i,
            })
        ).toBeNull()
        expect(
            screen.queryByRole('link', {
                name: /webhooks/i,
            })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('link', {
                name: /administration/i,
            })
        ).toBeInTheDocument()
    })
})
