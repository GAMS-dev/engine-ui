import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'
import axios from 'axios';
import LicenseUpdateForm from '../components/LicenseUpdateForm';

vi.mock('axios');

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useParams: vi.fn(),
    }
})

import { useParams } from 'react-router-dom'

const routes = [{ path: '/users/user1', element: <p>after submit went back to usage</p> }]

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ routes: routes }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('LicenseUpdateForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useParams).mockReturnValue({
            userToEdit: 'user1',
        })
        axios.get.mockRejectedValue({
            response: {
                status: 404,
            }
        })
    })

    it('renders LicenseUpdateForm correctly', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
    });

    it('shows error correctly if no license exists', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
    });

    it('shows error correctly if other problems occur in get', async () => {
        axios.get.mockRejectedValue({
            response: {
                data: {
                    message: 'some error'
                }
            }
        })
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Problems while retrieving user license. Error message: some error./));
    });

    it('shows the correct license (not inherited)', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            data: [{
                user: 'user1',
                inherited_from: 'user1',
                license: 'license12345'
            }]
        })
        axios.put.mockResolvedValue([])
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/license12345/));

    });

    it('shows inherited license ', async () => {
        axios.get.mockResolvedValue({
            status: 200,
            data: [{
                user: 'user1',
                inherited_from: 'admin',
                license: 'license12345'
            }]
        })
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/User inherits the license from/));
        expect(screen.getByRole("link", { name: 'admin' })).toHaveAttribute(
            'href',
            '/users/admin'
        )
    });

    it('updates license correctly', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new license' } })
        fireEvent.click(screen.getByRole('button'))
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });

    it('shows error if empty license is given', async () => {
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
        fireEvent.click(screen.getByRole('button'))
        await waitFor(() => screen.findByText(/Cannot submit empty license/));
    });

    it('handles errors of submit correctly', async () => {
        axios.put.mockRejectedValue({
            response: {
                status: 400,
                data: {
                    message: 'some error occurred'
                }
            }
        })
        render(<LicenseUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/User does not have and does not inherit any license/));
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new license' } })
        fireEvent.click(screen.getByRole('button'))
        await waitFor(() => screen.findByText(/An error occurred while updating user license. Error message: some error occurred./));
    });

    // CAN NOT TEST DELETE !!!!!!!!!!!!!!
    // due to error in jest when multiple submit buttons are used:
    // https://github.com/jsdom/jsdom/issues/3117

})
