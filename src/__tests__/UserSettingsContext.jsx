import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

import AuthContext from '../contexts/AuthContext'
import ServerInfoContext from '../contexts/ServerInfoContext'
import UserSettingsForm from '../components/UserSettingsForm'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import ServerConfigContext from '../contexts/ServerConfigContext'
import UserSettingsFormGeneral from '../components/UserSettingsFormGeneral'
import UserSettingsFormWebPush from '../components/UserSettingsFormWebPush'
import { useContext } from 'react'
import UserSettingsProvider from '../providers/UserSettingsProvider'
import UserSettingsContext from '../contexts/UserSettingsContext'

const AdminAuthProviderWrapper = ({ children }) => (
    <MemoryRouter initialEntries={['/']}>
        <ServerInfoContext.Provider value={[{}, () => { }]}>
            <ServerConfigContext.Provider value={[{}, () => { }]}>
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
    <MemoryRouter initialEntries={['/']}>
        <ServerInfoContext.Provider value={[{}, () => { }]}>
            <ServerConfigContext.Provider value={[{}, () => { }]}>
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

        expect(screen.getByText('h')).toBeInTheDocument()
        expect(screen.getByText('s/s')).toBeInTheDocument()
        expect(screen.getByText('3600')).toBeInTheDocument()
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

        expect(screen.getByText('h')).toBeInTheDocument()
        expect(screen.getByText('s/s')).toBeInTheDocument()
        expect(screen.getByText('3600')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('localstorage is correctly set', async () => {
        render(
            <UserSettingsProvider>
                <Routes>
                    <Route path="/" element={<UserSettingsForm />}>
                        <Route path="general" element={<UserSettingsFormGeneral />} />
                        <Route path="notifications" element={<UserSettingsFormWebPush />} />
                        <Route index element={<Navigate to="general" replace />} />
                    </Route>
                </Routes>
            </UserSettingsProvider>,
            {
                wrapper: AuthProviderWrapper,
            }
        )
        const select = await screen.findByLabelText(/Default table page length/i);
        fireEvent.keyDown(select, { key: 'ArrowDown' });
        await waitFor(() => screen.getByText('100'))
        fireEvent.click(screen.getByText('100'))

        expect(window.localStorage.getAll()).toEqual({
            userSettings:
                '{"notAdmin":{"tablePageLength":"100","_version":1}}',
        })
    })

    it('if multiple user use the same browser, both settings are saved', async () => {
        render(
            <UserSettingsProvider>
                <Routes>
                    <Route path="/" element={<UserSettingsForm />}>
                        <Route path="general" element={<UserSettingsFormGeneral />} />
                        <Route path="notifications" element={<UserSettingsFormWebPush />} />
                        <Route index element={<Navigate to="general" replace />} />
                    </Route>
                </Routes>
            </UserSettingsProvider>,
            {
                wrapper: AuthProviderWrapper,
            }
        )
        render(
            <UserSettingsProvider>
                <Routes>
                    <Route path="/" element={<UserSettingsForm />}>
                        <Route path="general" element={<UserSettingsFormGeneral />} />
                        <Route path="notifications" element={<UserSettingsFormWebPush />} />
                        <Route index element={<Navigate to="general" replace />} />
                    </Route>
                </Routes>
            </UserSettingsProvider>,
            {
                wrapper: AdminAuthProviderWrapper,
            }
        )
        expect(window.localStorage.getAll()).toEqual({
            userSettings:
                '{"notAdmin":{"tablePageLength":"10","_version":1},"admin":{"tablePageLength":"10","_version":1}}',
        })
    })
})
