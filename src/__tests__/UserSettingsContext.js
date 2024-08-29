import React, { useContext } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import {
    UserSettingsContext,
    UserSettingsProvider,
} from '../components/UserSettingsContext'
import { AuthContext } from '../AuthContext'
import { ServerInfoContext } from '../ServerInfoContext'
import UserSettingsForm from '../components/UserSettingsForm'
import { MemoryRouter } from 'react-router-dom'
import { ServerConfigContext } from '../ServerConfigContext'

const AdminAuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <ServerInfoContext.Provider value={[{}, () => {}]}>
            <ServerConfigContext.Provider value={[{}, () => {}]}>
                <AuthContext.Provider
                    value={[{ server: 'http://localhost', username: 'admin' }]}
                >
                    {children}
                </AuthContext.Provider>
            </ServerConfigContext.Provider>
        </ServerInfoContext.Provider>
    </MemoryRouter>
)

const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <ServerInfoContext.Provider value={[{}, () => {}]}>
            <ServerConfigContext.Provider value={[{}, () => {}]}>
                <AuthContext.Provider
                    value={[
                        { server: 'http://localhost', username: 'notAdmin' },
                    ]}
                >
                    {children}
                </AuthContext.Provider>
            </ServerConfigContext.Provider>
        </ServerInfoContext.Provider>
    </MemoryRouter>
)

const TestingComponent = () => {
    const [userSettings] = useContext(UserSettingsContext)
    return (
        <>
            <p>{userSettings?.quotaUnit}</p>
            <p>{userSettings?.multiplierUnit}</p>
            <p>{userSettings?.quotaConversionFactor}</p>
            <p>{userSettings?.tablePageLength}</p>
        </>
    )
}

let testUserSettings = {}
testUserSettings['admin'] = {
    _version: 1,
    quotaUnit: '$',
    multiplierUnit: '¢/s',
    quotaConversionFactor: 100,
    tablePageLength: '20',
}

const localStorageMock = (function () {
    let store = {}

    return {
        getItem(key) {
            return store[key] ? store[key] : JSON.stringify({})
        },

        setItem(key, value) {
            store[key] = value
        },

        clear() {
            store = {}
        },

        removeItem(key) {
            delete store[key]
        },

        getAll() {
            return store
        },
    }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const setLocalStorage = (id, data) => {
    window.localStorage.setItem(id, JSON.stringify(data))
}

describe('UserSettingsContext', () => {
    beforeEach(() => {
        window.localStorage.clear()
    })

    it('provides expected UserSettingsContext obj to child elements', () => {
        render(<UserSettingsProvider />, {
            wrapper: AuthProviderWrapper,
        })
    })

    it('if user has set his settings they are displayed', () => {
        setLocalStorage('userSettings', testUserSettings)
        render(
            <UserSettingsProvider>
                <TestingComponent />
            </UserSettingsProvider>,
            {
                wrapper: AdminAuthProviderWrapper,
            }
        )

        expect(screen.getByText('$')).toBeInTheDocument()
        expect(screen.getByText('¢/s')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('if a second user logs in and has not set settings yet, but another has, use still default values', () => {
        setLocalStorage('userSettings', testUserSettings)
        render(
            <UserSettingsProvider>
                <TestingComponent />
            </UserSettingsProvider>,
            {
                wrapper: AuthProviderWrapper,
            }
        )

        expect(screen.getByText('$')).toBeInTheDocument()
        expect(screen.getByText('¢/s')).toBeInTheDocument()
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('localstorage is correctly set', async () => {
        render(
            <UserSettingsProvider>
                <UserSettingsForm />
            </UserSettingsProvider>,
            {
                wrapper: AuthProviderWrapper,
            }
        )
        fireEvent.keyDown(document.getElementById('selectMultUnit'), {
            key: 'ArrowDown',
        })
        await waitFor(() => screen.getByText('s/s'))
        fireEvent.click(screen.getByText('s/s'))

        expect(window.localStorage.getAll()).toEqual({
            userSettings:
                '{"notAdmin":{"quotaUnit":"h","multiplierUnit":"s/s","quotaConversionFactor":3600,"tablePageLength":"10","_version":1}}',
        })
    })

    it('if multiple user use the same browser, both settings are saved', async () => {
        render(
            <UserSettingsProvider>
                <UserSettingsForm />
            </UserSettingsProvider>,
            {
                wrapper: AuthProviderWrapper,
            }
        )
        render(
            <UserSettingsProvider>
                <UserSettingsForm />
            </UserSettingsProvider>,
            {
                wrapper: AdminAuthProviderWrapper,
            }
        )
        expect(window.localStorage.getAll()).toEqual({
            userSettings:
                '{"notAdmin":{"quotaUnit":"$","multiplierUnit":"¢/s","quotaConversionFactor":100,"tablePageLength":"10","_version":1},"admin":{"quotaUnit":"$","multiplierUnit":"¢/s","quotaConversionFactor":100,"tablePageLength":"10","_version":1}}',
        })
    })
})
