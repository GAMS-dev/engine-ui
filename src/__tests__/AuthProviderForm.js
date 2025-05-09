import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'
import axios from 'axios';

import AuthProviderForm from '../components/AuthProviderForm'

jest.mock('axios');

describe('AuthProviderForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/auth/providers/all':
                    return Promise.resolve({
                        status: 200, data: [
                            {
                                "name": "gams_engine",
                                "label": "Login",
                                "hidden": false,
                                "oauth2": null,
                                "oidc": null,
                                "is_main_identity_provider": true,
                                "is_ldap_identity_provider": false
                            }
                        ]
                    })
                case 'testserver/auth/ldap-providers':
                    return Promise.resolve({
                        status: 200, data: {
                            "name": "string",
                            "label": "string",
                            "hidden": true,
                            "host": "string",
                            "port": 0,
                            "uid": "string",
                            "bind_dn": "string",
                            "password": "string", // pragma: allowlist secret
                            "encryption": "string",
                            "active_directory": true,
                            "base": "string",
                            "user_filter": "string",
                            "verify_certificates": true
                        }
                    })
                case 'testserver/auth/oidc-providers':
                    return Promise.resolve({
                        status: 200, data: []
                    })
                case 'testserver/auth/oauth2-providers':
                    return Promise.resolve({
                        status: 200, data: []
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders AuthProviderForm correctly', async () => {
        render(<AuthProviderForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add New Identity Provider/));
    });

})
