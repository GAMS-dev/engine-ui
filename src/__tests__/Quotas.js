import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { within } from '@testing-library/dom'
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import Quotas from '../components/Quotas'
import { testDatax } from './utils/testData'

let startDate = new Date('2020-08-03T17:10:15.000000+00:00')
let endDate = new Date('2023-08-05T17:10:15.000000+00:00')

window.ResizeObserver = function () {
    return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    }
}

describe('Quotas with single job', () => {
    const testData = testDatax.test_single_job

    it('renders Quotas component for single job', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )
    })

    it('displays the jobs table correctly for a single job', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        // default was changed
        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        const aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('_'))
        fireEvent.click(aggregateDropdownEl.getByText('_'))

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('cell', { name: 'user1' })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('cell', { name: 'token1234' })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('cell', { name: 'instance_1' })
        ).toBeInTheDocument()
        expect(tableJobs.getByRole('cell', { name: '-' })).toBeInTheDocument()
        expect(tableJobs.getByRole('cell', { name: '0' })).toBeInTheDocument()
        expect(
            tableJobs.getByRole('cell', { name: '24:0:0' })
        ).toBeInTheDocument()
        expect(tableJobs.getByRole('cell', { name: '3' })).toBeInTheDocument()
        expect(
            tableJobs.getByRole('cell', { name: '2,592' })
        ).toBeInTheDocument()

        expect(tableJobs.getByText('token1234').closest('a')).toHaveAttribute(
            'href',
            '/jobs/token1234'
        )
    })

    it('displays the pool table correctly for a single job (not on pool)', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('cell', { name: 'No Usage data found' })
        ).toBeInTheDocument()
    })

    it('displays Total correctly and no charts are visible', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        expect(
            screen.getByText('Total: 2,592 $', { selector: 'h2' })
        ).toBeInTheDocument()

        expect(screen.queryByRole('img')).toBeNull()
    })
})

describe('Quotas loads with multiple jobs (with hypercube and pool)', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job

    it('renders Quotas component for multiple jobs', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )
    })

    it('displays both charts and tables with usage data', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        expect(
            screen.getByText('Total: 2.2 $', { selector: 'h2' })
        ).toBeInTheDocument()

        expect(
            screen.getByText('Users', { selector: 'h3' })
        ).toBeInTheDocument()
        expect(
            screen.getByText('Instances', { selector: 'h3' })
        ).toBeInTheDocument()
        expect(screen.queryByText('Pools *', { selector: 'h3' })).toBeNull()

        // can't look for canvas, because its saved as the name inside the 'img' role
        expect(screen.getAllByRole('img')).toHaveLength(2)

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.queryByRole('cell', { name: 'No Usage data found' })
        ).toBeNull()

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.queryByRole('cell', { name: 'No Usage data found' })
        ).toBeNull()
    })

    it('displays correct data in the tables', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        const aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('_'))
        fireEvent.click(aggregateDropdownEl.getByText('_'))

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 0.6',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token2 job_1 - 0 0:0:20 3 0.6',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_1 token3 HC hypercube_instance1 - 1 0:0:20 1 0.2',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_2 token4 HC pool_instance pool_1 0 0:0:20 2 0.4',
            })
        ).toBeInTheDocument()

        // 4 * jobs + users
        expect(tableJobs.getAllByRole('link')).toHaveLength(8)

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'User Pool Label Instance Number Crashes Idle Time Multiplier $',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', {
                name: 'pool_user pool_1 pool_instance 0 0:0:20 2 0.4',
            })
        ).toBeInTheDocument()
    })

    it('displays correct data in the tables if grouped by user', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Number Crashes Number Jobs Solve Time $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool 0 2 0:0:40 1.2',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'hc_1 1 1 0:0:20 0.2' })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'hc_2 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()

        // 3 users
        expect(tableJobs.getAllByRole('link')).toHaveLength(3)

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'User Number Crashes Number Pools Idle Time $',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', { name: 'pool_user 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()
    })

    it('displays correct data in the tables if grouped by instance', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })

        const aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('Instance'))
        fireEvent.click(aggregateDropdownEl.getByText('Instance'))

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'Instance Number Crashes Number Jobs Solve Time $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'job_1 0 2 0:0:40 1.2' })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hypercube_instance1 1 1 0:0:20 0.2',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'pool_instance 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()

        expect(tableJobs.queryByRole('link')).toBeNull()

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'Instance Number Crashes Number Pools Idle Time $',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', { name: 'pool_instance 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()
    })

    it('displays correct data in the tables if grouped by pool label', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })

        const aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('Pool Label'))
        fireEvent.click(aggregateDropdownEl.getByText('Pool Label'))

        expect(
            screen.getByText('Total: 0.8 $', { selector: 'h2' })
        ).toBeInTheDocument()

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'Pool Label Number Crashes Number Jobs Solve Time $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'pool_1 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()

        expect(tableJobs.queryByRole('link')).toBeNull()

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'Pool Label Number Crashes Number Pools Idle Time $',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', { name: 'pool_1 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()
    })

    it('changing aggregate multiple times works', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        let aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('_'))
        fireEvent.click(aggregateDropdownEl.getByText('_'))

        let tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 0.6',
            })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(5)

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('Pool Label'))
        fireEvent.click(aggregateDropdownEl.getByText('Pool Label'))

        expect(
            screen.getByText('Total: 0.8 $', { selector: 'h2' })
        ).toBeInTheDocument()

        expect(
            tableJobs.getByRole('row', {
                name: 'Pool Label Number Crashes Number Jobs Solve Time $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'pool_1 0 1 0:0:20 0.4' })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(2)

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        await waitFor(() => aggregateDropdownEl.getByText('Instance'))
        fireEvent.click(aggregateDropdownEl.getByText('Instance'))

        expect(
            tableJobs.getByRole('row', {
                name: 'Instance Number Crashes Number Jobs Solve Time $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'job_1 0 2 0:0:40 1.2' })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(4)

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        await waitFor(() => aggregateDropdownEl.getByText('User'))
        fireEvent.click(aggregateDropdownEl.getByText('User'))

        expect(
            tableJobs.getByRole('row', {
                name: 'User Number Crashes Number Jobs Solve Time $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool 0 2 0:0:40 1.2',
            })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(4)

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        await waitFor(() => aggregateDropdownEl.getByText('_'))
        fireEvent.click(aggregateDropdownEl.getByText('_'))

        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier $',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 0.6',
            })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(5)
    })
})

describe('charts cut of correctly when to many parts are given', () => {
    const testData = testDatax.test_too_many_pool_labels

    it('displays only first 10 pool labels in chart', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        expect(screen.queryByText('Users', { selector: 'h3' })).toBeNull()
        expect(screen.queryByText('Instances', { selector: 'h3' })).toBeNull()
        expect(
            screen.getByText('Pools *', { selector: 'h3' })
        ).toBeInTheDocument()

        expect(screen.getAllByRole('img')).toHaveLength(1)
        expect(
            screen.getByText(
                'Only the 10 most used pool_label displayed in the chart.'
            )
        ).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
    })
})

describe('test cases in calculateQuota', () => {
    const testData = testDatax.test_calc_quota_cases

    it('cases in calculateQuota work', () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={new Date('2021-08-03T17:10:15.000000+00:00')}
                calcEndTime={new Date('2021-08-05T17:10:15.000000+00:00')}
            />,
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )
        expect(screen.getAllByRole('img')).toHaveLength(3)
    })
})

describe('test h also works', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job

    it('h with multiple jobs ', async () => {
        render(
            <Quotas
                data={testData}
                calcStartDate={startDate}
                calcEndTime={endDate}
            />,
            {
                wrapper: ({ children }) => (
                    <AllProvidersWrapperDefault options={{ quotaUnit: 'h' }}>
                        {children}
                    </AllProvidersWrapperDefault>
                )
            }
        )

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), {
            key: 'ArrowDown',
        })
        const aggregateDropdownEl = within(
            document.getElementById('aggregateDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('_'))
        fireEvent.click(aggregateDropdownEl.getByText('_'))

        expect(
            screen.getByText('Total: 0.061 h', { selector: 'h2' })
        ).toBeInTheDocument()

        let tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier h',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 0.017',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token2 job_1 - 0 0:0:20 3 0.017',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_1 token3 HC hypercube_instance1 - 1 0:0:20 1 0.006',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_2 token4 HC pool_instance pool_1 0 0:0:20 2 0.011',
            })
        ).toBeInTheDocument()
    })
})
