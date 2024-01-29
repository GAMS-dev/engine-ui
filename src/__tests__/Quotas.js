import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { within } from '@testing-library/dom'
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'

import Quotas from '../components/Quotas';
import { testDatax } from '../utils/testData';


let startDate = new Date('2020-08-03T17:10:15.000000+00:00');
let endDate = new Date('2023-08-05T17:10:15.000000+00:00');

const RouterWrapper = ({ children }) => (
    <MemoryRouter>
        {children}
    </MemoryRouter>
);

window.ResizeObserver = function () {
    return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    };
};


describe('Quotas with single job', () => {
    const testData = testDatax.test_single_job

    it('renders Quotas component for single job', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });
    });

    it('displays the jobs table correctly for a single job', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        const tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: 'user1' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: 'token1234' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: 'instance_1' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: '-' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: '0' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: '24:0:0' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: '3' })).toBeInTheDocument();
        expect(tableJobs.getByRole('cell', { name: '259,200' })).toBeInTheDocument();

        expect(tableJobs.getByText('token1234').closest('a')).toHaveAttribute('href', '/jobs/token1234')
    });

    it('displays the pool table correctly for a single job (not on pool)', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        const tablePool = within(screen.getByTestId('tableIdlePool'));
        expect(tablePool.getByRole('cell', { name: 'No Usage data found' })).toBeInTheDocument();
    });

    it('displays Total correctly and no charts are visible', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        expect(screen.getByText('Total: 259,200 mults', { selector: 'h2' })).toBeInTheDocument();

        expect(screen.queryByRole('img')).toBeNull();
    });
});

describe('Quotas loads with multiple jobs (with hypercube and pool)', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job

    it('renders Quotas component for multiple jobs', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });
    });

    it('displays both charts and tables with usage data', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        expect(screen.getByText('Total: 220 mults', { selector: 'h2' })).toBeInTheDocument();

        expect(screen.getByText('Users', { selector: 'h3' })).toBeInTheDocument();
        expect(screen.getByText('Instances', { selector: 'h3' })).toBeInTheDocument();
        expect(screen.queryByText('Pool *', { selector: 'h3' })).toBeNull();

        // can't look for canvas, because its saved as the name inside the 'img' role
        expect(screen.getAllByRole('img')).toHaveLength(2);

        const tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.queryByRole('cell', { name: 'No Usage data found' })).toBeNull();

        const tablePool = within(screen.getByTestId('tableIdlePool'));
        expect(tablePool.queryByRole('cell', { name: 'No Usage data found' })).toBeNull();
    });

    it('displays correct data in the tables', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        const tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 60' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool token2 job_1 - 0 0:0:20 3 60' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hc_1 token3 HC hypercube_instance1 - 1 0:0:20 1 20' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hc_2 token4 HC pool_instance pool_1 0 0:0:20 2 40' })).toBeInTheDocument();

        expect(tableJobs.getAllByRole('link')).toHaveLength(4);

        const tablePool = within(screen.getByTestId('tableIdlePool'));
        expect(tablePool.getByRole('row', { name: 'User Pool Label Instance Number Crashes Solve Time Multiplier mults' })).toBeInTheDocument();
        expect(tablePool.getByRole('row', { name: 'pool_user pool_1 pool_instance 0 0:0:20 2 40' })).toBeInTheDocument();
    });

    it('displays correct data in the tables if grouped by user', async () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });

        const aggregateDropdownEl = within(document.getElementById('aggregateDropdown'))
        await waitFor(() => aggregateDropdownEl.getByText('User'));
        fireEvent.click(aggregateDropdownEl.getByText('User'));


        const tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'User Number Crashes Number Jobs Solve Time mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool 0 2 0:0:40 120' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hc_1 1 1 0:0:20 20' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hc_2 0 1 0:0:20 40' })).toBeInTheDocument();

        expect(tableJobs.queryByRole('link')).toBeNull();

        const tablePool = within(screen.getByTestId('tableIdlePool'));
        expect(tablePool.getByRole('row', { name: 'User Number Crashes Number Pools Solve Time mults' })).toBeInTheDocument();
        expect(tablePool.getByRole('row', { name: 'pool_user 0 1 0:0:20 40' })).toBeInTheDocument();
    });

    it('displays correct data in the tables if grouped by instance', async () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });

        const aggregateDropdownEl = within(document.getElementById('aggregateDropdown'))
        await waitFor(() => aggregateDropdownEl.getByText('Instance'));
        fireEvent.click(aggregateDropdownEl.getByText('Instance'));


        const tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'Instance Number Crashes Number Jobs Solve Time mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_1 0 2 0:0:40 120' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hypercube_instance1 1 1 0:0:20 20' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'pool_instance 0 1 0:0:20 40' })).toBeInTheDocument();

        expect(tableJobs.queryByRole('link')).toBeNull();

        const tablePool = within(screen.getByTestId('tableIdlePool'));
        expect(tablePool.getByRole('row', { name: 'Instance Number Crashes Number Pools Solve Time mults' })).toBeInTheDocument();
        expect(tablePool.getByRole('row', { name: 'pool_instance 0 1 0:0:20 40' })).toBeInTheDocument();
    });

    it('displays correct data in the tables if grouped by pool label', async () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });

        const aggregateDropdownEl = within(document.getElementById('aggregateDropdown'))
        await waitFor(() => aggregateDropdownEl.getByText('Pool Label'));
        fireEvent.click(aggregateDropdownEl.getByText('Pool Label'));

        expect(screen.getByText('Total: 80 mults', { selector: 'h2' })).toBeInTheDocument();

        const tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'Pool Label Number Crashes Number Jobs Solve Time mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'pool_1 0 1 0:0:20 40' })).toBeInTheDocument();


        expect(tableJobs.queryByRole('link')).toBeNull();

        const tablePool = within(screen.getByTestId('tableIdlePool'));
        expect(tablePool.getByRole('row', { name: 'Pool Label Number Crashes Number Pools Solve Time mults' })).toBeInTheDocument();
        expect(tablePool.getByRole('row', { name: 'pool_1 0 1 0:0:20 40' })).toBeInTheDocument();
    });

    it('changing aggregate multiple times works', async () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        let tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 60' })).toBeInTheDocument();
        expect(tableJobs.getAllByRole('row')).toHaveLength(5);

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });
        let aggregateDropdownEl = within(document.getElementById('aggregateDropdown'))
        await waitFor(() => aggregateDropdownEl.getByText('Pool Label'));
        fireEvent.click(aggregateDropdownEl.getByText('Pool Label'));

        expect(screen.getByText('Total: 80 mults', { selector: 'h2' })).toBeInTheDocument();

        expect(tableJobs.getByRole('row', { name: 'Pool Label Number Crashes Number Jobs Solve Time mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'pool_1 0 1 0:0:20 40' })).toBeInTheDocument();
        expect(tableJobs.getAllByRole('row')).toHaveLength(2);

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });
        await waitFor(() => aggregateDropdownEl.getByText('Instance'));
        fireEvent.click(aggregateDropdownEl.getByText('Instance'));

        expect(tableJobs.getByRole('row', { name: 'Instance Number Crashes Number Jobs Solve Time mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_1 0 2 0:0:40 120' })).toBeInTheDocument();
        expect(tableJobs.getAllByRole('row')).toHaveLength(4);

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });
        await waitFor(() => aggregateDropdownEl.getByText('User'));
        fireEvent.click(aggregateDropdownEl.getByText('User'));

        expect(tableJobs.getByRole('row', { name: 'User Number Crashes Number Jobs Solve Time mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool 0 2 0:0:40 120' })).toBeInTheDocument();
        expect(tableJobs.getAllByRole('row')).toHaveLength(4);

        fireEvent.keyDown(document.getElementById('aggregateDropdown'), { key: 'ArrowDown' });
        await waitFor(() => aggregateDropdownEl.getByText('_'));
        fireEvent.click(aggregateDropdownEl.getByText('_'));

        expect(tableJobs.getByRole('row', { name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier mults' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 60' })).toBeInTheDocument();
        expect(tableJobs.getAllByRole('row')).toHaveLength(5);

    });
});

describe('charts cut of correctly when to many parts are given', () => {
    const testData = testDatax.test_too_many_pool_labels

    it('displays only first 10 pool labels in chart', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });

        expect(screen.queryByText('Users', { selector: 'h3' })).toBeNull();
        expect(screen.queryByText('Instances', { selector: 'h3' })).toBeNull();
        expect(screen.getByText('Pool *', { selector: 'h3' })).toBeInTheDocument();

        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.getByText('Only the 10 most used pool_label displayed in the chart.')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
    })
})

describe('test cases in calculateQuota', () => {
    const testData = testDatax.test_calc_quota_cases

    it('cases in calculateQuota work', () => {
        render(<Quotas data={testData} calcStartDate={new Date('2021-08-03T17:10:15.000000+00:00')} calcEndTime={new Date('2021-08-05T17:10:15.000000+00:00')} quotaUnit='mults' />, {
            wrapper: RouterWrapper
        });
        expect(screen.getAllByRole('img')).toHaveLength(3);
    })
})

describe('test multh also works', () => {
    const testData = testDatax.test_hypercube_with_pool_and_job

    it('multh with multiple jobs ', () => {
        render(<Quotas data={testData} calcStartDate={startDate} calcEndTime={endDate} quotaUnit='multh' />, {
            wrapper: RouterWrapper
        });

        expect(screen.getByText('Total: 0.061 multh', { selector: 'h2' })).toBeInTheDocument();

        let tableJobs = within(screen.getByTestId('tableJobs'));
        expect(tableJobs.getByRole('row', { name: 'User Job token Instance Pool Label Number Crashes Solve Time Multiplier multh' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool token1 job_1 - 0 0:0:20 3 0.017' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'job_not_on_pool token2 job_1 - 0 0:0:20 3 0.017' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hc_1 token3 HC hypercube_instance1 - 1 0:0:20 1 0.006' })).toBeInTheDocument();
        expect(tableJobs.getByRole('row', { name: 'hc_2 token4 HC pool_instance pool_1 0 0:0:20 2 0.011' })).toBeInTheDocument();

    })
})