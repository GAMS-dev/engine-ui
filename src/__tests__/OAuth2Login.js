import React from 'react';
import axios from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom'

import { AuthContext } from '../AuthContext';
import LoginForm from '../components/LoginForm';
import { OAuthClient } from './utils/oauth'

const { Crypto } = require("@peculiar/webcrypto");


const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <AuthContext.Provider value={[{ server: "http://localhost", login: false }]}>
            {children}
        </AuthContext.Provider>
    </MemoryRouter>
);

jest.mock('axios');

Object.defineProperty(window, "crypto", {
    value: new Crypto(),
});
Object.assign(global, { TextDecoder, TextEncoder });

describe('LoginForm with OAuth2 flow', () => {
    it('prints error with invalid native client id', async () => {
        axios.get.mockImplementation((url) => {
            if (url.endsWith('/auth/password-policy')) {
                return Promise.resolve({
                    status: 200, data: {
                        min_password_length: 20,
                        must_include_uppercase: true,
                        must_include_lowercase: true,
                        must_include_number: true,
                        must_include_special_char: true,
                        not_in_popular_passwords: true,
                    }
                })
            }
            if (url.endsWith('/auth/providers')) {
                return Promise.resolve({ status: 200, data: [] })
            }
            console.log(url)
        });
        Object.defineProperty(window, "location", {
            value: {
                search: '?nc_id=test1234',
            },
            writable: true,
        });
        render(
            <LoginForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => {
            expect(screen.getByText('Invalid native client id: test1234')).toBeInTheDocument();
        })
    });
    it('prints error with missing nc parameters', async () => {
        axios.get.mockImplementation((url) => {
            if (url.endsWith('/auth/password-policy')) {
                return Promise.resolve({
                    status: 200, data: {
                        min_password_length: 20,
                        must_include_uppercase: true,
                        must_include_lowercase: true,
                        must_include_number: true,
                        must_include_special_char: true,
                        not_in_popular_passwords: true,
                    }
                })
            }
            if (url.endsWith('/auth/providers')) {
                return Promise.resolve({ status: 200, data: [] })
            }
            console.log(url)
        });
        Object.defineProperty(window, "location", {
            value: {
                search: '?nc_id=com.gams.miro',
            },
            writable: true,
        });
        render(
            <LoginForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => {
            expect(screen.getByText('Missing native client parameters')).toBeInTheDocument();
        })
    });
    it('prints error with missing nc parameters', async () => {
        axios.get.mockImplementation((url) => {
            if (url.endsWith('/auth/password-policy')) {
                return Promise.resolve({
                    status: 200, data: {
                        min_password_length: 20,
                        must_include_uppercase: true,
                        must_include_lowercase: true,
                        must_include_number: true,
                        must_include_special_char: true,
                        not_in_popular_passwords: true,
                    }
                })
            }
            if (url.endsWith('/auth/providers')) {
                return Promise.resolve({ status: 200, data: [] })
            }
            console.log(url)
        });
        Object.defineProperty(window, "location", {
            value: {
                search: '?nc_id=com.gams.miro',
            },
            writable: true,
        });
        render(
            <LoginForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => {
            expect(screen.getByText('Missing native client parameters')).toBeInTheDocument();
        })
    });
    it('OAuth2 redirect works with valid nc params', async () => {
        axios.get.mockImplementation((url) => {
            if (url.endsWith('/auth/password-policy')) {
                return Promise.resolve({
                    status: 200, data: {
                        min_password_length: 20,
                        must_include_uppercase: true,
                        must_include_lowercase: true,
                        must_include_number: true,
                        must_include_special_char: true,
                        not_in_popular_passwords: true,
                    }
                })
            }
            if (url.endsWith('/auth/providers')) {
                return Promise.resolve({
                    status: 200, data: [{
                        name: 'test',
                        "is_main_identity_provider": false, "is_ldap_identity_provider": false,
                        oidc: {
                            "issuer": "https://accounts.google.com",
                            "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
                            "token_endpoint": "https://oauth2.googleapis.com/token",
                            "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
                            "web_ui_client_id": "testclientid", "scopes": ["email", "profile", "openid"],
                            "has_web_ui_client_secret": true
                        }
                    }]
                })
            }
            console.log(url)
        });
        Object.defineProperty(window, "location", {
            value: {
                search: '?provider=test&nc_id=com.gams.miro&nc_redirect_uri=/test/def&nc_public_key=mysuperpublicpublickey',
                replace: jest.fn(() => null),
                origin: 'http://localhost'
            },
            writable: true,
        });
        Object.defineProperty(window, "sessionStorage", {
            value: {
                setItem: jest.fn(() => null),
            },
            writable: true,
        });
        render(
            <LoginForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => {
            expect(window.location.replace).toBeCalledWith(expect.stringMatching(/https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?response_type=code&client_id=testclientid&scope=email%20profile%20openid&state=[a-zA-Z0-9_\-\/]+&redirect_uri=http%3A%2F%2Flocalhost&code_challenge=[a-zA-Z0-9_\-\/]+&code_challenge_method=S256/))
            expect(window.sessionStorage.setItem).toBeCalledWith('authParams', expect.stringMatching(/nativeClientParams/))
        })
    });
    it('Encrypting Engine token works with valid nc params', async () => {
        const oAuthClient = await OAuthClient.build()
        const publicKey = await oAuthClient.getB64URLEncodedPublicKey()
        const tokenEndpointUrl = "https://oauth2.googleapis.com/token"
        axios.get.mockImplementation((url) => {
            if (url.endsWith('/auth/password-policy')) {
                return Promise.resolve({
                    status: 200, data: {
                        min_password_length: 20,
                        must_include_uppercase: true,
                        must_include_lowercase: true,
                        must_include_number: true,
                        must_include_special_char: true,
                        not_in_popular_passwords: true,
                    }
                })
            }
            if (url.endsWith('/auth/providers')) {
                return Promise.resolve({
                    status: 200, data: [{
                        name: 'test',
                        "is_main_identity_provider": false,
                        "is_ldap_identity_provider": false,
                        oidc: {
                            "issuer": "https://accounts.google.com",
                            "authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
                            "token_endpoint": tokenEndpointUrl,
                            "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs",
                            "web_ui_client_id": "testclientid", "scopes": ["email", "profile", "openid"],
                            "has_web_ui_client_secret": true
                        }
                    }]
                })
            }
            console.log(url)
        });
        Object.defineProperty(window, "location", {
            value: {
                search: '?state=blablabla123&code=test12345',
                replace: (url) => {
                    if (url.startsWith('com.gams.miro:')) {
                        const urlParsed = new URL(url)
                        expect(urlParsed.protocol).toBe('com.gams.miro:')
                        expect(urlParsed.pathname).toBe('/auth/login')
                        oAuthClient.decryptData(urlParsed.searchParams.get('jwt'),
                            urlParsed.searchParams.get('aes_key'),
                            urlParsed.searchParams.get('aes_iv')).then((jwt) => {
                                expect(jwt).toBe('myaccesstoken')
                            })
                    }
                    return null;
                },
                origin: 'http://localhost'
            },
            writable: true,
        });
        Object.defineProperty(window, "sessionStorage", {
            value: {
                getItem: jest.fn((id) => id === 'registrationData' ? null : JSON.stringify({
                    state: 'blablabla123',
                    isOidc: true,
                    tokenEndpoint: tokenEndpointUrl,
                    codeVerifier: 'mamama123',
                    clientId: 'myclientid',
                    nativeClientParams: {
                        id: 'com.gams.miro',
                        redirect_uri: '/auth/login',
                        public_key_b64: publicKey
                    }
                })),
                removeItem: jest.fn(() => null)
            },
            writable: true,
        });
        axios.post.mockImplementation((url) => url === tokenEndpointUrl ? Promise.resolve({
            status: 200, data: { id_token: 'myidtoken' }
        }) :
            (url.endsWith('/auth/oidc-providers/login') ? Promise.resolve({
                status: 200, data: { token: 'myaccesstoken' }
            }) : null))
        render(
            <LoginForm />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => {
            expect(axios.post).toBeCalledWith(
                '/api/auth/oidc-providers/login', { expires_in: expect.any(Number), id_token: 'myidtoken' });
            expect(screen.getByText('Authentication successful. You can now close this window.')).toBeInTheDocument()
        })
    });
});
