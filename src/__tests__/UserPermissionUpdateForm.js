import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'
import axios from 'axios';
import UserPermissionUpdateForm from '../components/UserPermissionUpdateForm';
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const routes = [
    { path: '/users/user1', element: <p>after submit went back to usage</p> },
    { path: '/users/user2', element: <p>after submit went back to usage</p> }]

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ routes: routes }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('UserPermissionUpdateForm', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
                case 'testserver/namespaces/':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'name': 'global',
                                'permissions': [
                                    {
                                        'username': 'user2',
                                        'permission': 7
                                    },
                                    {
                                        'username': 'user1',
                                        'permission': 7
                                    },
                                    {
                                        'username': 'admin',
                                        'permission': 7
                                    }
                                ],
                                'disk_quota': null
                            },
                            {
                                'name': 'namespace2',
                                'permissions': [
                                    {
                                        'username': 'admin',
                                        'permission': 7
                                    }
                                ],
                                'disk_quota': null
                            }
                        ]
                    })
                case 'testserver/users/':
                    if (params?.username === 'user1') {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    'username': 'user1',
                                    'roles': [],
                                    'deleted': false,
                                    'old_username': 'test1',
                                    'inviter_name': 'user2',
                                    'invitation_time': '2024-04-15T12:45:39.866973+00:00',
                                    'identity_provider': 'gams_engine',
                                    'identity_provider_user_subject': 'user1'
                                }
                            ]
                        })
                    } else if (params?.username === 'user2') {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    'username': 'user2',
                                    'roles': ['inviter'],
                                    'deleted': false,
                                    'old_username': 'test1',
                                    'inviter_name': 'user2',
                                    'invitation_time': '2024-04-15T12:45:39.866973+00:00',
                                    'identity_provider': 'gams_engine',
                                    'identity_provider_user_subject': 'user2'
                                }
                            ]
                        })
                    }
                    else {
                        return Promise.reject(new Error('not found'))
                    }
                case 'testserver/users/inviters-providers/admin':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'name': 'gams_engine',
                                'label': 'Login',
                                'hidden': false,
                                'oauth2': null,
                                'oidc': null,
                                'is_main_identity_provider': true,
                                'is_ldap_identity_provider': false
                            }
                        ]
                    })
                case 'testserver/users/inviters-providers/user1':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'name': 'gams_engine',
                                'label': 'Login',
                                'hidden': false,
                                'oauth2': null,
                                'oidc': 'stuff',
                                'is_main_identity_provider': false,
                                'is_ldap_identity_provider': false
                            }
                        ]
                    })
                case 'testserver/users/inviters-providers/user2':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'name': 'some_provider',
                                'label': 'Login',
                                'hidden': false,
                                'oauth2': null,
                                'oidc': 'stuff',
                                'is_main_identity_provider': false,
                                'is_ldap_identity_provider': false
                            },
                            {
                                'name': 'gams_engine',
                                'label': 'Login',
                                'hidden': false,
                                'oauth2': null,
                                'oidc': null,
                                'is_main_identity_provider': true,
                                'is_ldap_identity_provider': false
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

    it('renders UserPermissionUpdateForm corectly', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
    });

    it('sends no request but redirects if nothing is changed', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        expect(axios.put).toHaveBeenCalledTimes(0);
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });

    it('changes role to admin correctly', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))
        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: 'Specify a role for the user' });
        await userEvent.selectOptions(roleSelectorEl, 'Admin');
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        expect(axios.put).toBeCalledWith(
            'testserver/users/role',
            { 'roles': ['admin'], 'username': 'user1' }
        );
        expect(axios.put).toHaveBeenCalledTimes(1);
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });


    it('changes role from inviter to user correctly', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))
        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: 'Specify a role for the user' });
        await userEvent.selectOptions(roleSelectorEl, 'User');

        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        expect(axios.put).toBeCalledWith(
            'testserver/users/role',
            { 'roles': [], 'username': 'user2' }
        );
        expect(axios.put).toHaveBeenCalledTimes(1);
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });

    it('changes role from user to inviter with different provider correctly', async () => {
        // to check that two put request were sent with the correct values
        let roleGetWasCalled = false
        let providerGetWasCalled = false
        axios.put.mockImplementation((url, data) => {
            switch (url) {
                case 'testserver/users/role':
                    if (JSON.stringify(data) === JSON.stringify({ 'username': 'user1', 'roles': ['inviter'] })) {
                        roleGetWasCalled = true
                    }
                    return
                case 'testserver/users/inviters-providers/user1':
                    let requestValue = new FormData()
                    requestValue.append('name', 'some_provider');
                    if (JSON.stringify(data) === JSON.stringify(requestValue)) {
                        providerGetWasCalled = true
                    }
                    return
                default:
                    return Promise.reject(new Error('not found'))
            }

        })
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))
        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: 'Specify a role for the user' });
        await userEvent.selectOptions(roleSelectorEl, 'Inviter');
        await waitFor(() => screen.findByText(/Identity providers user is allowed to invite with/))
        fireEvent.click(screen.getByRole('button', { name: 'Remove gams_engine' }))
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        await waitFor(() => screen.findByText(/after submit went back to usage/));
        expect(roleGetWasCalled).toBeTruthy()
        expect(providerGetWasCalled).toBeTruthy()
    });

    it('fails if changes role from user to inviter with no provider specified', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))
        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: 'Specify a role for the user' });
        await userEvent.selectOptions(roleSelectorEl, 'Inviter');
        await waitFor(() => screen.findByText(/Identity providers user is allowed to invite with/))
        fireEvent.click(screen.getByRole('button', { name: 'Remove gams_engine' }))
        fireEvent.click(screen.getByRole('button', { name: 'Remove some_provider' }))
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        await waitFor(() => screen.findByText(/Please select at least one identity provider that the user is allowed to invite with, or select the "User" role./))
        expect(axios.put).toHaveBeenCalledTimes(0);
    });

    it('changes namespace permissions from inviter', async () => {
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Specify/))
        const readCheckbox = screen.getByRole('checkbox', { name: 'Read' });
        const writeCheckbox = screen.getByRole('checkbox', { name: 'Write' });
        const executeCheckbox = screen.getByRole('checkbox', { name: 'Execute' });
        // user1 has all permissions for the global namespace
        expect(readCheckbox.checked).toEqual(true)
        expect(writeCheckbox.checked).toEqual(true)
        expect(executeCheckbox.checked).toEqual(true)
        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: '' });
        await userEvent.selectOptions(roleSelectorEl, 'namespace2');
        // but none for namespace2
        expect(readCheckbox.checked).toEqual(false)
        expect(writeCheckbox.checked).toEqual(false)
        expect(executeCheckbox.checked).toEqual(false)

        fireEvent.click(writeCheckbox)
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        let requestValue = new FormData()
        requestValue.append('username', 'user1');
        requestValue.append('permissions', '2');
        expect(axios.put).toBeCalledWith(
            'testserver/namespaces/namespace2/permissions',
            requestValue
        );
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });

    it('handles errors while retrieving both fail', async () => {
        axios.get.mockRejectedValue({
            response: {
                status: 400,
            }
        })
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Problems while retrieving user roles. Error message: undefined./))
    })

    it('handles errors while retrieving namespace', async () => {
        // the request for the namespace is called first apperently
        axios.get.mockRejectedValueOnce(new Error('not found'));
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: [
                {
                    'username': 'user1',
                    'roles': [],
                    'deleted': false,
                    'old_username': 'test1',
                    'inviter_name': 'user2',
                    'invitation_time': '2024-04-15T12:45:39.866973+00:00',
                    'identity_provider': 'gams_engine',
                    'identity_provider_user_subject': 'user1'
                }
            ]
        });
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Problems while retrieving namespaces. Error message: not found./))
    })

    it('handles errors while retrieving identity provider', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })
        // the first two get request need to work
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: [
                {
                    'name': 'namespace2',
                    'permissions': [
                        {
                            'username': 'admin',
                            'permission': 7
                        }
                    ],
                    'disk_quota': null
                }
            ]
        });
        axios.get.mockResolvedValueOnce({
            status: 200,
            data: [
                {
                    'username': 'user1',
                    'roles': [],
                    'deleted': false,
                    'old_username': 'test1',
                    'inviter_name': 'user2',
                    'invitation_time': '2024-04-15T12:45:39.866973+00:00',
                    'identity_provider': 'gams_engine',
                    'identity_provider_user_subject': 'user1'
                }
            ]
        });
        axios.get.mockRejectedValueOnce(new Error('not found'));
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/Problems while retrieving identity providers. Error message: not found./))
    });

    it('handles errors while submitting role', async () => {
        axios.put.mockRejectedValue({
            response: {
                status: 400
            }
        })
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Specify/))
        // userEvent works better for selects
        const roleSelectorEl = screen.getByRole('combobox', { name: 'Specify a role for the user' });
        await userEvent.selectOptions(roleSelectorEl, 'Inviter');
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        await waitFor(() => screen.findByText(/An error occurred while updating user roles. Error message: undefined./));
    });

    it('handles errors while submitting identity providers', async () => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user2' })
        axios.put.mockRejectedValue({
            response: {
                status: 400
            }
        })
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Specify/))
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        await waitFor(() => screen.findByText(/An error occurred while updating available identity providers. Error message: undefined./));
    });

    it('handles errors while submitting user permissions', async () => {
        axios.put.mockRejectedValue({
            response: {
                status: 400
            }
        })
        render(<UserPermissionUpdateForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Specify/))
        const writeCheckbox = screen.getByRole('checkbox', { name: 'Write' });
        fireEvent.click(writeCheckbox)
        fireEvent.click(screen.getByRole('button', { name: 'Update Permissions' }))
        await waitFor(() => screen.findByText(/An error occurred while updating user permissions. Error message: undefined./));
    });
})
