import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils'

import UserInviteesTree from '../components/UserInviteesTree';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

describe('UserInviteesTree', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'mainuser' })
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/users/':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                "username": "mainuser",
                                "roles": [
                                    "admin"
                                ],
                                "deleted": false,
                                "old_username": null,
                                "inviter_name": null,
                                "invitation_time": null,
                                "identity_provider": "gams_engine",
                                "identity_provider_user_subject": "admin"
                            },
                            {
                                "username": "user1",
                                "roles": [
                                    "user"
                                ],
                                "deleted": false,
                                "inviter_name": "mainuser",
                                "invitation_time": "2024-04-08T15:17:33.046930+00:00",
                                "identity_provider": "gams_engine",
                                "identity_provider_user_subject": "user2"
                            },
                            {
                                "username": "user2",
                                "roles": ["inviter"],
                                "deleted": false,
                                "inviter_name": "mainuser",
                                "invitation_time": "2024-04-08T15:17:33.046930+00:00",
                                "identity_provider": "gams_engine",
                                "identity_provider_user_subject": "user2"
                            },
                            {
                                "username": "user3",
                                "roles": [
                                    "user"
                                ],
                                "deleted": false,
                                "inviter_name": "user1",
                                "invitation_time": "2024-04-15T12:45:39.866973+00:00",
                                "identity_provider": "gams_engine",
                                "identity_provider_user_subject": "user1"
                            }
                        ]
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    const originalError = console.error
    beforeAll(() => {
        console.error = (...args) => {
            if (/Warning.*not wrapped in act/.test(args[0])) {
                return
            }
            originalError.call(console, ...args)
        }
    })

    afterAll(() => {
        console.error = originalError
    })

    it('renders UserInviteesTree correctly', async () => {
        render(<UserInviteesTree />, {
            wrapper: AllProvidersWrapperDefault
        });
    });

    it('shows all invitees', async () => {
        render(<UserInviteesTree />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/mainuser/))
        // check all users ar listed
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
        expect(screen.getByText('user3')).toBeInTheDocument();
        expect(screen.getByText('user1').closest('a')).toHaveAttribute('href', '/users/user1')
        expect(screen.getByText('user2').closest('a')).toHaveAttribute('href', '/users/user2')
        expect(screen.getByText('user3').closest('a')).toHaveAttribute('href', '/users/user3')
        // check all roles a given
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('inviter')).toBeInTheDocument();
        expect(screen.getAllByText('user')).toHaveLength(2);
    });

    it('shows "No Invitees" if no exist', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })
        render(<UserInviteesTree />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/user2/))
        expect(screen.getByText('No invitees')).toBeInTheDocument();
        expect(screen.queryByText('mainuser')).toBeInTheDocument();
        expect(screen.queryByText('user1')).toBeInTheDocument();
        // user1 should be closed
        expect(screen.queryByText('user3')).toBeNull();
    })

    it('closes the list if triangle is clicked ', async () => {
        render(<UserInviteesTree />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/mainuser/))
        fireEvent.click(screen.getAllByText('▼')[0])

        expect(screen.queryByText('user1')).toBeInTheDocument();
        expect(screen.queryByText('user2')).toBeInTheDocument();
        expect(screen.queryByText('user3')).toBeNull();
    })

    it('shows whole subtree', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user3' })
        render(<UserInviteesTree />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/mainuser/))
        // here expect both users before since the response is the same
        expect(screen.queryByText('mainuser')).toBeInTheDocument();
        expect(screen.queryByText('user1')).toBeInTheDocument();

    })

    it('handles errors while retrieving', async () => {
        axios.get.mockRejectedValue({
            response: {
                status: 400,
            }
        })
        render(<UserInviteesTree />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Failed to fetch users information. Error message: undefined/))
    })
})
