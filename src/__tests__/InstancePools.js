import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import InstancePools from '../components/InstancePools'

jest.mock('axios')

const AllProvidersWrapperDisabled = ({ children }) => (
    <AllProvidersWrapperDefault options={{ instance_pool_access: 'DISABLED' }}>
        {children}
    </AllProvidersWrapperDefault>
);

const AllProvidersWrapperEnabled = ({ children }) => (
    <AllProvidersWrapperDefault options={{ instance_pool_access: 'ENABLED' }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('InstancePools Component', () => {
    it('renders InstancePools correctly', async () => {
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: { instance_pools_available: [] },
        })

        render(<InstancePools />, {
            wrapper: AllProvidersWrapperDisabled,
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
            wrapper: AllProvidersWrapperDisabled,
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
            wrapper: AllProvidersWrapperDisabled,
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
            wrapper: AllProvidersWrapperEnabled,
        })

        await waitFor(() => screen.findByText('Change Size'))
    })
})
