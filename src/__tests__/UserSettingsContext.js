import React, { useContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'

import { UserSettingsContext, UserSettingsProvider } from "../components/UserSettingsContext";
import { AuthContext } from '../AuthContext';
import { ServerInfoContext } from '../ServerInfoContext';
import UserSettingsForm from '../components/UserSettingsForm';
import { MemoryRouter } from 'react-router-dom';


const AdminAuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <ServerInfoContext.Provider value={[{}, () => { }]}>
            <AuthContext.Provider value={[{ server: "http://localhost", username: 'admin' }]}>
                {children}
            </AuthContext.Provider>
        </ServerInfoContext.Provider>
    </MemoryRouter>
);

const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <ServerInfoContext.Provider value={[{}, () => { }]}>
            <AuthContext.Provider value={[{ server: "http://localhost", username: 'notAdmin' }]}>
                {children}
            </AuthContext.Provider>
        </ServerInfoContext.Provider>
    </MemoryRouter>
);

const TestingComponent = () => {
    const [userSettings,] = useContext(UserSettingsContext)
    return (
        <>
            <p>{userSettings?.quotaUnit}</p>
            <p>{userSettings?.tablePageLength}</p>
        </>
    );
};

let testUserSettings = {}
testUserSettings['admin'] = {
    quotaUnit: 'multh',
    tablePageLength: '20'
}

describe('UserSettingsContext', () => {
    it('provides expected UserSettingsContext obj to child elements', () => {
        render(
            <UserSettingsProvider />, {
            wrapper: AuthProviderWrapper
        });
    });

    it('if user has set his settings they are displayed', () => {
        Object.defineProperty(window, "localStorage", {
            value: {
                getItem: jest.fn(() => JSON.stringify(testUserSettings)),
                setItem: jest.fn(() => null),
            },
            writable: true,
        });
        render(
            <UserSettingsProvider>
                <TestingComponent />
            </UserSettingsProvider>, {
            wrapper: AdminAuthProviderWrapper
        });

        expect(screen.getByText('multh')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('if a second user logs in and has not set settings yet, but another has, use still default values', () => {
        Object.defineProperty(window, "localStorage", {
            value: {
                getItem: jest.fn(() => JSON.stringify(testUserSettings)),
                setItem: jest.fn(() => null),
            },
            writable: true,
        });
        render(
            <UserSettingsProvider>
                <TestingComponent />
            </UserSettingsProvider>, {
            wrapper: AuthProviderWrapper
        });

        expect(screen.getByText('mults')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('localstorage is correctly set', async () => {
        Object.defineProperty(window, "localStorage", {
            value: {
                getItem: jest.fn(() => JSON.stringify(testUserSettings)),
                setItem: jest.fn(() => null),
            },
            writable: true,
        });
        render(
            <UserSettingsProvider>
                <UserSettingsForm />
            </UserSettingsProvider>, {
            wrapper: AuthProviderWrapper
        });
        fireEvent.keyDown(document.getElementById('selectQuotaUnit'), { key: 'ArrowDown' });
        await waitFor(() => screen.getByText('multh'));
        fireEvent.click(screen.getByText('multh'));

        expect(window.localStorage.setItem).toHaveBeenLastCalledWith('userSettings', '{"notAdmin":{"quotaUnit":"multh","tablePageLength":"10"}}')

    });

});
