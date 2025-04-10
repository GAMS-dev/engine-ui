import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { within } from '@testing-library/dom'
import '@testing-library/jest-dom'
import axios from 'axios';
import UserUpdateIdentityProviderForm from '../components/UserUpdateIdentityProviderForm';
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const routes = [
    { path: '/users/user1', element: <p>after submit went back to usage</p> }]

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ routes: routes }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('UserUpdateIdentityProviderForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
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
                                    'inviter_name': 'admin',
                                    'invitation_time': '2024-04-15T12:45:39.866973+00:00',
                                    'identity_provider': 'gams_engine',
                                    'identity_provider_user_subject': 'user1'
                                }
                            ]
                        })
                    } else if (params?.username === 'admin') {
                        return Promise.resolve({
                            status: 200,
                            data: []
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
                            },
                            {
                                'name': 'test_provider',
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

    it('renders UserUpdateIdentityProviderForm corectly', async () => {
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });
    });

    it('shows all identity providers in dropdown', async () => {
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.keyDown(document.getElementById('identityProviderDropdown'), {
            key: 'ArrowDown',
        })
        const aggregateDropdownEl = within(
            document.getElementById('identityProviderDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('None (block user)'))
        expect(aggregateDropdownEl.queryByText(/test_provider/)).toBeInTheDocument();
    });

    it('fails if the passwords do not match', async () => {
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpassword1' } })
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpassword2' } })
        fireEvent.click(screen.getByRole('button'))
        expect(screen.queryByText(/The passwords you entered do not match/)).toBeInTheDocument();
    });

    it('sends the correct put request and redirects back to usage', async () => {
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpassword' } })
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpassword' } })
        fireEvent.click(screen.getByRole('button', { name: 'Change Identity Provider' }))

        let requestValue = new FormData()
        requestValue.append('username', 'user1')
        requestValue.append('identity_provider_name', 'gams_engine');
        requestValue.append('password', 'newpassword');
        expect(axios.put).toBeCalledWith(
            'testserver/users/identity-provider',
            requestValue
        );
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    });

    it('blocks user if none is selected and submitted', async () => {
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.keyDown(document.getElementById('identityProviderDropdown'), {
            key: 'ArrowDown',
        })
        const aggregateDropdownEl = within(
            document.getElementById('identityProviderDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('None (block user)'))
        fireEvent.click(aggregateDropdownEl.getByText('None (block user)'))
        fireEvent.click(screen.getByRole('button'))
        // the text is split in a <div> ... <code> ...</code> ... </div> so need to check for the text in blocks
        expect(screen.queryByText(/You are about to remove the identity provider from the user:/)).toBeInTheDocument()
        expect(screen.queryByText(/user1/)).toBeInTheDocument()
        expect(screen.queryByText(/. This user will no longer be able to log in./)).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Block User' }))
        let requestValue = new FormData()
        requestValue.append('username', 'user1')
        requestValue.append('identity_provider_name', '');
        expect(axios.put).toBeCalledWith(
            'testserver/users/identity-provider',
            requestValue
        );
        await waitFor(() => screen.findByText(/after submit went back to usage/));
    })

    it('cancles correctly if cancel is pressed in block user', async () => {
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.keyDown(document.getElementById('identityProviderDropdown'), {
            key: 'ArrowDown',
        })
        const aggregateDropdownEl = within(
            document.getElementById('identityProviderDropdown')
        )
        await waitFor(() => aggregateDropdownEl.getByText('None (block user)'))
        fireEvent.click(aggregateDropdownEl.getByText('None (block user)'))
        fireEvent.click(screen.getByRole('button'))
        // the text is split in a <div> ... <code> ...</code> ... </div> so need to check for the text in blocks
        expect(screen.queryByText(/You are about to remove the identity provider from the user:/)).toBeInTheDocument()
        expect(screen.queryByText(/user1/)).toBeInTheDocument()
        expect(screen.queryByText(/. This user will no longer be able to log in./)).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
        // make sure no put is called if it got canceled
        await expect(axios.put).toHaveBeenCalledTimes(0);
    })

    it('handles errors while retrieving identity providers', async () => {
        axios.get.mockRejectedValue({
            response: {
                status: 400,
            }
        })
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/Problems while retrieving identity providers. Error message: undefined./))
    })

    it('handles errors while submission', async () => {
        axios.put.mockRejectedValue({
            response: {
                status: 400
            }
        })
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpassword' } })
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpassword' } })
        fireEvent.click(screen.getByRole('button', { name: 'Change Identity Provider' }))
        await waitFor(() => screen.findByText(/Some error occurred while trying to update the identity provider. Error message: undefined./))
    })

    it('handles errors while submission, with message in response', async () => {
        axios.put.mockRejectedValue({
            response: {
                status: 400,
                data: {
                    errors: { password: "test error" } // pragma: allowlist secret
                }
            }
        })
        render(<UserUpdateIdentityProviderForm />, {
            wrapper: AllProvidersWrapper
        });

        await waitFor(() => screen.findByText(/gams_engine/))
        fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpassword' } })
        fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpassword' } })
        fireEvent.click(screen.getByRole('button', { name: 'Change Identity Provider' }))
        await waitFor(() => screen.findByText(/Problems trying to update the identity provider./))
        await waitFor(() => screen.findByText(/test error/))
    })

    // TODO test for some different identity provider than engine
})
