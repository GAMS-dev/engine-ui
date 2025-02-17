import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InstancePools from '../components/InstancePools'
import { AuthContext } from '../AuthContext'
import { AlertContext } from '../components/Alert'
import { ServerConfigContext } from '../ServerConfigContext'
import { UserSettingsContext } from '../components/UserSettingsContext'
import axios from 'axios'

jest.mock('axios')

const mockAuthContext = {
    jwt: 'test-jwt',
    server: 'http://test-server',
    username: 'test-user',
    roles: ['admin'],
}

const RouterWrapper = (options) => {
    return ({ children }) => (
        <MemoryRouter>
            <AuthContext.Provider value={[mockAuthContext]}>
                <AlertContext.Provider value={[jest.fn()]}>
                    <ServerConfigContext.Provider
                        value={[
                            {
                                instance_pool_access:
                                    options?.instance_pool_access ?? 'DISABLED',
                            },
                            jest.fn(),
                        ]}
                    >
                        <UserSettingsContext.Provider
                            value={[{ tablePageLength: 10 }]}
                        >
                            {children}
                        </UserSettingsContext.Provider>
                    </ServerConfigContext.Provider>
                </AlertContext.Provider>
            </AuthContext.Provider>
        </MemoryRouter>
    )
}

describe('InstancePools Component', () => {
    it('renders InstancePools correctly', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: { instance_pools_available: [] },
        })

        render(<InstancePools />, {
            wrapper: RouterWrapper(),
        })
        await waitFor(() => screen.findByText('Instance pools disabled'))
        await waitFor(() => screen.findByText('Instance Pools'))
        await waitFor(() => screen.findByText('Enable Instance Pools'))
    })

    it('refresh button triggers API call', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            data: { instance_pools_available: [] },
        })

        render(<InstancePools />, {
            wrapper: RouterWrapper(),
        })

        const refreshButton = screen.getByText('Refresh')

        fireEvent.click(refreshButton)

        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2))
    })

    it('clicking enable instance pools opens modal', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: { instance_pools_available: [] },
        })
        render(<InstancePools />, {
            wrapper: RouterWrapper(),
        })

        fireEvent.click(screen.getByText('Enable Instance Pools'))

        await waitFor(() =>
            screen.findByText(
                'Are you sure that you want to enable instance pools?'
            )
        )
    })
    it('Instance pool table renders', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: {
                instance_pools_available: [
                    {
                        label: 'test123',
                        owner: {
                            username: 'admin',
                            deleted: false,
                            old_username: null,
                        },
                        instance: {
                            label: 'test',
                            cpu_request: 0.3,
                            memory_request: 100,
                            workspace_request: 100,
                            node_selectors: [],
                            tolerations: [],
                            multiplier: 1.0,
                            multiplier_idle: 1.0,
                        },
                        size: 0,
                        size_active: 0,
                        size_busy: 0,
                        cancelling: false,
                    },
                ],
            },
        })
        render(<InstancePools />, {
            wrapper: RouterWrapper({ instance_pool_access: 'ENABLED' }),
        })

        await waitFor(() => screen.findByText('Change Size'))
    })
})
