import { waitFor, within } from '@testing-library/dom';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import { Outlet, Route, Routes } from 'react-router-dom';
import Quotas from '../components/Quotas';
import { testDatax } from './utils/testData';

let startDate = new Date('2020-08-03T17:10:15.000000+00:00')
let endDate = new Date('2023-08-05T17:10:15.000000+00:00')

const getQuotaComponent = ({ data, startDate, endDate, isLoading = false, downloadProgress = 0 }) => {
    return <Routes>
        <Route path="/" element={<Outlet context={{ data, startDate, endDate, isLoading, downloadProgress }} />}>
            <Route index element={<Quotas />} />
        </Route>
    </Routes>
}


describe('Quotas with single job', () => {
    const testData = testDatax.test_single_job

    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders Quotas component for single job', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )
        screen.getByText('Aggregate')
    })

    it('displays the jobs table correctly for a single job', async () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        // default was changed
        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.click(dropdown);
        const option = await screen.findByText('_');
        await user.click(option);

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier Cost',
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
            tableJobs.getByRole('cell', { name: '$2,592.00' })
        ).toBeInTheDocument()

        expect(tableJobs.getByText('token1234').closest('a')).toHaveAttribute(
            'href',
            '/jobs/token1234'
        )
    })

    it('displays the pool table correctly for a single job (not on pool)', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
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
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        expect(
            screen.getByText('Total: $2,592.00', { selector: 'h2' })
        ).toBeInTheDocument()

        expect(screen.queryByRole('img')).toBeNull()
    })
})

describe('Quotas loads with multiple jobs (with hypercube and pool)', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders Quotas component for multiple jobs', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )
    })

    it('displays both charts and tables with usage data', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        expect(
            screen.getByText('Total: $2.20', { selector: 'h2' })
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
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.click(dropdown);
        const option = await screen.findByText('_');
        await user.click(option);

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 $0.60',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token2 job_1 - 0 0:0:20 3 $0.60',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_1 token3HC hypercube_instance1 - 1 0:0:20 1 $0.20',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_2 token4HC pool_instance pool_1 0 0:0:20 2 $0.40',
            })
        ).toBeInTheDocument()

        // 4 * jobs + users
        expect(tableJobs.getAllByRole('link')).toHaveLength(8)

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'User Pool Label Instance Number Crashes Idle Time Multiplier Cost',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', {
                name: 'pool_user pool_1 pool_instance 0 0:0:20 2 $0.40',
            })
        ).toBeInTheDocument()
    })

    it('displays correct data in the tables if grouped by user', async () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Number Crashes Number Jobs Solve Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool 0 2 0:0:40 $1.20',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'hc_1 1 1 0:0:20 $0.20' })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'hc_2 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()

        // 3 users
        expect(tableJobs.getAllByRole('link')).toHaveLength(3)

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'User Number Crashes Number Pools Idle Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', { name: 'pool_user 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()
    })

    it('displays correct data in the tables if grouped by instance', async () => {
        ;
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.type(dropdown, 'Instance{enter}');

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'Instance Number Crashes Number Jobs Solve Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'job_1 0 2 0:0:40 $1.20' })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hypercube_instance1 1 1 0:0:20 $0.20',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'pool_instance 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()

        expect(tableJobs.queryByRole('link')).toBeNull()

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'Instance Number Crashes Number Pools Idle Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', { name: 'pool_instance 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()
    })

    it('displays correct data in the tables if grouped by pool label', async () => {
        ;
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.type(dropdown, 'Pool Label{enter}');

        expect(
            screen.getByText('Total: $0.80', { selector: 'h2' })
        ).toBeInTheDocument()

        const tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'Pool Label Number Crashes Number Jobs Solve Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'pool_1 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()

        expect(tableJobs.queryByRole('link')).toBeNull()

        const tablePool = within(screen.getByTestId('tableIdlePool'))
        expect(
            tablePool.getByRole('row', {
                name: 'Pool Label Number Crashes Number Pools Idle Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tablePool.getByRole('row', { name: 'pool_1 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()
    })

    it('changing aggregate multiple times works', async () => {
        ;
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.type(dropdown, '_{enter}');

        let tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 $0.60',
            })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(5)

        await user.type(dropdown, 'Pool Label{enter}');

        expect(
            screen.getByText('Total: $0.80', { selector: 'h2' })
        ).toBeInTheDocument()

        expect(
            tableJobs.getByRole('row', {
                name: 'Pool Label Number Crashes Number Jobs Solve Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'pool_1 0 1 0:0:20 $0.40' })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(2)

        await user.click(dropdown);
        const instanceOption = await screen.findByText('Instance');
        await user.click(instanceOption);

        expect(
            tableJobs.getByRole('row', {
                name: 'Instance Number Crashes Number Jobs Solve Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', { name: 'job_1 0 2 0:0:40 $1.20' })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(4)

        await user.type(dropdown, 'User{enter}');

        expect(
            tableJobs.getByRole('row', {
                name: 'User Number Crashes Number Jobs Solve Time Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool 0 2 0:0:40 $1.20',
            })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(4)

        await user.type(dropdown, '_{enter}');

        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 $0.60',
            })
        ).toBeInTheDocument()
        expect(tableJobs.getAllByRole('row')).toHaveLength(5)
    })
})

describe('charts cut of correctly when to many parts are given', () => {
    const testData = testDatax.test_too_many_pool_labels

    it('displays only first 10 pool labels in chart', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
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
            getQuotaComponent({ data: testData, startDate: new Date('2021-08-03T17:10:15.000000+00:00'), endDate: new Date('2021-08-05T17:10:15.000000+00:00') }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )
        expect(screen.getAllByRole('img')).toHaveLength(3)
    })
})

describe('test h also works', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('h with multiple jobs ', async () => {
        ;
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: ({ children }) => (
                    <AllProvidersWrapperDefault options={{ quotaUnit: 'h' }}>
                        {children}
                    </AllProvidersWrapperDefault>
                )
            }
        )

        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.click(dropdown);
        const option = await screen.findByText('_');
        await user.click(option);

        expect(
            screen.getByText('Total: 0.061h', { selector: 'h2' })
        ).toBeInTheDocument()

        let tableJobs = within(screen.getByTestId('tableJobs'))
        expect(
            tableJobs.getByRole('row', {
                name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier Cost',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 0.017h',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'job_not_on_pool token2 job_1 - 0 0:0:20 3 0.017h',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_1 token3HC hypercube_instance1 - 1 0:0:20 1 0.006h',
            })
        ).toBeInTheDocument()
        expect(
            tableJobs.getByRole('row', {
                name: 'hc_2 token4HC pool_instance pool_1 0 0:0:20 2 0.011h',
            })
        ).toBeInTheDocument()
    })
})

describe('test hypercube jobs get displayed correctly', () => {
    const testData = testDatax.test_hypercube_job
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders Quotas component for hypercube job without lables correctly', async () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate }),
            {
                wrapper: AllProvidersWrapperDefault,
            }
        )

        const dropdown = await screen.findByLabelText(/aggregate/i);
        await user.click(dropdown);
        const option = await screen.findByText('_');
        await user.click(option);


        let tableJobs = within(screen.getByTestId('tableJobs'))

        expect(
            tableJobs.getByRole('row', {
                name: 'hc_1 token3HC default - 1 0:0:20 1 $0.20',
            })
        ).toBeInTheDocument()

        // show default since one hc job has no labels
        await screen.findByText(/default/i);
    })
})

describe('Quotas loading states', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders the progress bar correctly when isLoading is true and is_saas is true', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate, isLoading: true }),
            {
                wrapper: ({ children }) => (
                    <AllProvidersWrapperDefault options={{ is_saas: true }}>
                        {children}
                    </AllProvidersWrapperDefault>
                )
            }
        )

        expect(screen.getByText('Fetching Usage Data...')).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()

    })

    it('renders the progress bar with the correct partial percentage', () => {
        const testProgress = 68;

        render(
            getQuotaComponent({ data: testData, startDate, endDate, isLoading: true, downloadProgress:testProgress }),
            {
                wrapper: ({ children }) => (
                    <AllProvidersWrapperDefault options={{ is_saas: true }}>
                        {children}
                    </AllProvidersWrapperDefault>
                )
            }
        )

        const progressBar = screen.getByRole('progressbar')

        expect(progressBar).toBeInTheDocument()
        expect(progressBar).toHaveStyle({ width: `${testProgress}%` })
        expect(progressBar).toHaveTextContent(`${testProgress}%`)
        expect(progressBar).toHaveAttribute('aria-valuenow', testProgress.toString())
    })

    it('renders the ClipLoader when isLoading is true and is_saas is false', () => {
        render(
            getQuotaComponent({ data: testData, startDate, endDate, isLoading: true }),
            {
                wrapper: ({ children }) => (
                    <AllProvidersWrapperDefault options={{ is_saas: false }}>
                        {children}
                    </AllProvidersWrapperDefault>
                )
            }
        )
        expect(screen.queryByText('Fetching Usage Data...')).toBeNull()
        expect(screen.queryByRole('progressbar')).toBeNull()
    })

})
