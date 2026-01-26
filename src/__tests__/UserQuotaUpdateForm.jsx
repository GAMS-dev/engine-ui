import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom'
import axios from 'axios';
import UserQuotaUpdateForm from '../components/UserQuotaUpdateForm';
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils';

vi.mock('axios');

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useParams: vi.fn(),
    }
})

import { useParams } from 'react-router-dom'

const routes = [
    { path: '/users/user1', element: <p>after submit went back to usage</p> }]

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ routes: routes }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('UserQuotaUpdateForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useParams).mockReturnValue({
            userToEdit: 'user1',
        })
        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
                case 'testserver/usage/quota':
                    if (params?.username === "user1") {
                        return Promise.resolve({
                            status: 200,
                            data: [{
                                "username": "user1",
                                "parallel_quota": 5,
                                "volume_quota": null,
                                "volume_used": 1000,
                                "disk_quota": null,
                                "disk_used": null
                            }, {
                                "username": "user2",
                                "parallel_quota": 10,
                                "volume_quota": null,
                                "volume_used": 2000,
                                "disk_quota": 500000,
                                "disk_used": 100000
                            },
                            {
                                "username": "user3",
                                "parallel_quota": 20,
                                "volume_quota": 5000,
                                "volume_used": 2000,
                                "disk_quota": 600000,
                                "disk_used": 200000
                            }]
                        })
                    } else if (params?.username === "admin") {
                        return Promise.resolve({
                            status: 200,
                            data: []
                        })
                    }
                    else {
                        return Promise.reject(new Error('not found'))
                    }
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders UserQuotaUpdateForm correctly', async () => {
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
    });

    it('displays everything correctly', async () => {
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Parallel Quota /));

        const parallelSpinButton = screen.getByRole('spinbutton', { name: "Parallel Quota (in ¢/s) Set to max" });
        const volumeSpinButton = screen.getByRole('spinbutton', { name: "Volume Quota (in $) Set to max" });
        const diskSpinButton = screen.getByRole('spinbutton', { name: "Disk Space Quota (in MB) Set to max" });

        expect(parallelSpinButton).toBeInTheDocument();
        expect(volumeSpinButton).toBeInTheDocument();
        expect(diskSpinButton).toBeInTheDocument();

        expect(parallelSpinButton).toHaveValue(5);
        expect(volumeSpinButton).toHaveValue(null);
        expect(diskSpinButton).toHaveValue(null);

        expect(parallelSpinButton).toHaveAttribute('min', '0');
        expect(volumeSpinButton).toHaveAttribute('min', '0');
        expect(diskSpinButton).toHaveAttribute('min', '0');

        expect(parallelSpinButton).toHaveAttribute('max', '10');
        expect(volumeSpinButton).toHaveAttribute('max', '50');
        expect(diskSpinButton).toHaveAttribute('max', '0.5');

        expect(screen.getByText('user2').closest('a')).toHaveAttribute('href', '/users/user2');
        expect(screen.getByText('user3').closest('a')).toHaveAttribute('href', '/users/user3');

        expect(screen.getAllByText(/Inherited from/i).length).toBe(2);

        const userLinks = screen.getAllByRole('link');

        expect(userLinks[0]).toHaveTextContent('user3');
        expect(userLinks[1]).toHaveTextContent('user2');

        // Parallel isn't inherited, volume is by user3 and disk from user2
        expect(userLinks[0]).toHaveAttribute('href', '/users/user3');
        expect(userLinks[1]).toHaveAttribute('href', '/users/user2');
    });

    it('set to max buttons work', async () => {
        const user = userEvent.setup();

        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        // 1. Wait for the form to load (important if data is fetched)
        await screen.findByText(/Parallel Quota/);

        // 2. Select the specific buttons
        // If "Set to max" is the text on the button, use that specifically.
        const setMaxButtons = screen.getAllByRole('button', { name: /set to max/i });
        expect(setMaxButtons).toHaveLength(3);

        // 3. Select the inputs
        // We use findByRole to ensure they are rendered
        const parallelInput = screen.getByRole('spinbutton', { name: /parallel quota/i });
        const volumeInput = screen.getByRole('spinbutton', { name: /volume quota/i });
        const diskInput = screen.getByRole('spinbutton', { name: /disk space/i });

        // 4. Click the buttons using the user instance
        await user.click(setMaxButtons[0]);
        await user.click(setMaxButtons[1]);
        await user.click(setMaxButtons[2]);

        // 5. Verification
        // Use toHaveValue for numeric inputs.
        // Note: spinbuttons often return numbers, but check if your component returns strings
        expect(parallelInput).toHaveValue(10);
        expect(volumeInput).toHaveValue(50);
        expect(diskInput).toHaveValue(0.5);
    });


    it('submits correctly if everything is updated', async () => {
        const user = userEvent.setup();
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Parallel Quota /));

        const parallelSpinButton = screen.getByRole('spinbutton', { name: "Parallel Quota (in ¢/s) Set to max" });
        const volumeSpinButton = screen.getByRole('spinbutton', { name: "Volume Quota (in $) Set to max" });
        const diskSpinButton = screen.getByRole('spinbutton', { name: "Disk Space Quota (in MB) Set to max" });

        await user.type(parallelSpinButton, '{control}a{backspace}2');
        await user.type(volumeSpinButton, '{control}a{backspace}2');
        await user.type(diskSpinButton, '{control}a{backspace}0.1');
        expect(parallelSpinButton).toHaveValue(2);
        expect(volumeSpinButton).toHaveValue(2);
        expect(diskSpinButton).toHaveValue(0.1);

        await user.click(screen.getByRole('button', { name: "Update Quotas" }))
        await waitFor(() => {
            expect(axios.put).toBeCalledWith(
                'testserver/usage/quota', null, {
                params: {
                    username: "user1",
                    disk_quota: 100000,
                    parallel_quota: 2,
                    volume_quota: 200
                }
            })
        })
        expect(axios.delete).toHaveBeenCalledTimes(0);
    });

    it('submits correctly if everything is deleted', async () => {
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Parallel Quota /));

        const parallelSpinButton = screen.getByRole('spinbutton', { name: "Parallel Quota (in ¢/s) Set to max" });
        const volumeSpinButton = screen.getByRole('spinbutton', { name: "Volume Quota (in $) Set to max" });
        const diskSpinButton = screen.getByRole('spinbutton', { name: "Disk Space Quota (in MB) Set to max" });

        // to actually set them to '' from a different value
        fireEvent.change(volumeSpinButton, { target: { value: 2 } })
        fireEvent.change(diskSpinButton, { target: { value: 0.1 } })

        fireEvent.change(parallelSpinButton, { target: { value: '' } })
        fireEvent.change(volumeSpinButton, { target: { value: '' } })
        fireEvent.change(diskSpinButton, { target: { value: '' } })

        fireEvent.click(screen.getByRole('button', { name: "Update Quotas" }))

        expect(axios.put).toHaveBeenCalledTimes(0);
        expect(axios.delete).toHaveBeenCalledTimes(3);
        expect(axios.delete).toBeCalledWith(
            'testserver/usage/quota', { "params": { "field": "parallel_quota", "username": "user1" } });
        expect(axios.delete).toBeCalledWith(
            'testserver/usage/quota', { "params": { "field": "volume_quota", "username": "user1" } });
        expect(axios.delete).toBeCalledWith(
            'testserver/usage/quota', { "params": { "field": "disk_quota", "username": "user1" } });
    });

    it('submits correctly if some are changed and some are deleted', async () => {
        const user = userEvent.setup();
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Parallel Quota /));

        const parallelSpinButton = screen.getByRole('spinbutton', { name: "Parallel Quota (in ¢/s) Set to max" });
        const volumeSpinButton = screen.getByRole('spinbutton', { name: "Volume Quota (in $) Set to max" });
        const diskSpinButton = screen.getByRole('spinbutton', { name: "Disk Space Quota (in MB) Set to max" });

        await user.type(parallelSpinButton, '{control}a{backspace}2');
        await user.type(volumeSpinButton, '{control}a{backspace}30');
        await user.type(diskSpinButton, '{control}a{backspace}');

        const submitBtn = screen.getByRole('button', { name: /update quotas/i });
        await user.click(submitBtn);

        expect(axios.put).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(axios.put).toBeCalledWith(
                'testserver/usage/quota', null, {
                params: {
                    username: "user1",
                    parallel_quota: 2,
                    volume_quota: 3000
                }
            })
        })
        expect(axios.delete).toHaveBeenCalledTimes(1);
        expect(axios.delete).toBeCalledWith(
            'testserver/usage/quota', { "params": { "field": "disk_quota", "username": "user1" } });
    });

    it('selector does not accept invalid input', async () => {
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Parallel Quota /));

        const parallelSpinButton = screen.getByRole('spinbutton', { name: "Parallel Quota (in ¢/s) Set to max" });
        const volumeSpinButton = screen.getByRole('spinbutton', { name: "Volume Quota (in $) Set to max" });
        const diskSpinButton = screen.getByRole('spinbutton', { name: "Disk Space Quota (in MB) Set to max" });

        fireEvent.change(parallelSpinButton, { target: { value: -1 } })
        fireEvent.change(volumeSpinButton, { target: { value: -1 } })
        fireEvent.change(diskSpinButton, { target: { value: -1 } })

        fireEvent.change(parallelSpinButton, { target: { class: "form-control is-invalid" } })
        fireEvent.change(volumeSpinButton, { target: { class: "form-control is-invalid" } })
        fireEvent.change(diskSpinButton, { target: { class: "form-control is-invalid" } })


        fireEvent.click(screen.getByRole('button', { name: "Update Quotas" }))

        expect(axios.put).toHaveBeenCalledTimes(0);
        expect(axios.delete).toHaveBeenCalledTimes(0);
    });

    it('handles errors while retrieving user quotas', async () => {
        axios.get.mockRejectedValue({
            message: "get failed"
        })
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Problems while retrieving user quotas. Error message: get failed./))
    })

    it('handles errors updating quota', async () => {
        axios.put.mockRejectedValue({
            message: "put failed"
        })
        render(<UserQuotaUpdateForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Parallel Quota /));

        const setMaxButtons = screen.getAllByRole('button', { name: "Set to max" });

        fireEvent.click(setMaxButtons[0])

        fireEvent.click(screen.getByRole('button', { name: "Update Quotas" }))

        await waitFor(() => screen.findByText(/An error occurred while updating user quotas. Error message: put failed./))
    })

    it('navigates correctly after submit', async () => {
        axios.put.mockResolvedValue({})
        render(<UserQuotaUpdateForm />
            , {
                wrapper: AllProvidersWrapper
            });
        await waitFor(() => screen.findByText(/Parallel Quota /));
        const parallelSpinButton = screen.getByRole('spinbutton', { name: "Parallel Quota (in ¢/s) Set to max" });
        fireEvent.change(parallelSpinButton, { target: { value: 2 } })

        fireEvent.click(screen.getByRole("button", { name: "Update Quotas" }))
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });
})
