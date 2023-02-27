import { useCallback, useEffect } from "react";
import { generateRandomString, generatePKCEParams } from "./oauth";
import { getResponseError } from "./util";
import axios from "axios";

const OAuth2Login = (props) => {
    const { server, loginConfig, setAuthToken, setErrorMsg } = props;

    useEffect(() => {
        const initiateOAuthLogin = async (config) => {
            const state = generateRandomString(32);
            const pkceParams = await generatePKCEParams();
            let requestScopes = [];
            let oauthConfig;

            if (config.oidc != null) {
                oauthConfig = config.oidc;
                requestScopes = oauthConfig.scopes;
            } else {
                oauthConfig = config.oauth2;
                const defaultScopes = ['CONFIGURATION', 'NAMESPACES', 'JOBS', 'USERS', 'HYPERCUBE',
                    'CLEANUP', 'LICENSES', 'USAGE', 'AUTH'];
                requestScopes = oauthConfig.scopes.filter(
                    scope_object => defaultScopes.includes(scope_object.scope))
                    .map(scope_object => scope_object.request_scope);
            }

            const queryParams = [
                'response_type=code',
                `client_id=${encodeURIComponent(oauthConfig.web_ui_client_id)}`,
                `scope=${encodeURIComponent(requestScopes.join(' '))}`,
                `state=${state}`,
                `redirect_uri=${encodeURIComponent(window.location.origin)}`,
                `code_challenge=${pkceParams.codeChallenge}`,
                'code_challenge_method=S256'
            ];
            sessionStorage.setItem('authParams', JSON.stringify({
                isOidc: config.oidc != null,
                clientId: oauthConfig.web_ui_client_id,
                tokenEndpoint: oauthConfig.has_web_ui_client_secret ? `${server}/auth/oauth2-token` : oauthConfig.token_endpoint,
                codeChallenge: pkceParams.codeChallenge,
                codeVerifier: pkceParams.codeVerifier,
                name: config.name,
                hasClientSecret: oauthConfig.has_web_ui_client_secret,
                state
            }));
            window.location.replace(`${oauthConfig.authorization_endpoint}?${queryParams.join('&')} `);
        };
        if (loginConfig?.oidc == null && loginConfig?.oauth2 == null) {
            return;
        }
        initiateOAuthLogin(loginConfig);
    }, [server, loginConfig])

    const oauthLogin = useCallback(async (authParams, code) => {
        if (code == null) {
            setErrorMsg('Internal error while retrieving authentication token from OAuth provider.');
            return;
        }
        let jwt = null;
        let refreshTokenData = null;
        try {
            const params = new URLSearchParams();
            params.append('redirect_uri', window.location.origin);
            params.append('code_verifier', authParams.codeVerifier);
            params.append('code', code);
            if (authParams.hasClientSecret === true) {
                params.append('identity_provider_name', authParams.name);
            } else {
                params.append('grant_type', 'authorization_code');
                params.append('client_id', authParams.clientId);
            }
            const response = await axios.post(authParams.tokenEndpoint, params);

            if (authParams.isOidc) {
                jwt = response.data.id_token;
                if (jwt == null) {
                    setErrorMsg('Internal error while retrieving id token from OpenID Connect provider.');
                    return;
                }
            } else {
                jwt = response.data.access_token;
                if (jwt == null) {
                    setErrorMsg('Internal error while retrieving authentication token from OAuth provider.');
                    return;
                }
                if (response.data.refresh_token != null) {
                    refreshTokenData = {
                        clientId: authParams.clientId,
                        refreshTokenEndpoint: authParams.tokenEndpoint,
                        refreshToken: response.data.refresh_token
                    }
                }
            }
        } catch (err) {
            setErrorMsg(`Problems retrieving authentication token from OAuth provider. Error message: ${getResponseError(err)}.`);
            return;
        }

        setAuthToken({
            jwt: jwt,
            isOAuthToken: true,
            isIdToken: authParams.isOidc,
            refreshTokenData: refreshTokenData
        });
    }, [setAuthToken, setErrorMsg]);

    useEffect(() => {
        if (!!!document.location.search.includes('state=')) {
            return;
        }
        const searchParams = new URLSearchParams(document.location.search);
        const authParams = JSON.parse(sessionStorage.getItem('authParams'));
        sessionStorage.removeItem('authParams');
        if (authParams?.state !== searchParams.get('state')) {
            setErrorMsg("OAuth2 error: Invalid state parameter.");
            return;
        }
        if (document.location.search.includes('error=') &&
            document.location.search.includes('error_description=')) {
            const searchParams = new URLSearchParams(document.location.search);
            setErrorMsg(searchParams.get('error_description'));
            return;
        }
        oauthLogin(authParams, searchParams.get('code'));
    }, [oauthLogin, setErrorMsg]);

    return (
        <>
        </>
    );
};

export default OAuth2Login;
