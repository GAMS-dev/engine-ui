import React, { useContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'

import { UserSettingsContext, UserSettingsProvider } from "../components/UserSettingsContext";
import { AuthContext } from '../AuthContext';
import UserSettingsForm from '../components/UserSettingsForm';


const AdminAuthProviderWrapper = ({ children }) => (
    <AuthContext.Provider value={[{ server: "http://localhost", username: 'admin'}]}>
        {children}
    </AuthContext.Provider>
);

const AuthProviderWrapper = ({ children }) => (
    <AuthContext.Provider value={[{ server: "http://localhost", username: 'notAdmin'}]}>
        {children}
    </AuthContext.Provider>
);

const TestingComponent = () => {
    const [userSettings,] = useContext(UserSettingsContext)
    return (
        <>
            <p>{userSettings?.mulitplierUnit}</p>
            <p>{userSettings?.tablePageLength}</p>
        </>
    );
};

let testUserSettings = {}
testUserSettings['admin'] = {
    mulitplierUnit: 'multh',
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
        screen.debug()
        fireEvent.keyDown(document.getElementById('selectMulitplierUnit'), { key: 'ArrowDown' });
        await waitFor(() => screen.getByText('multh'));
        fireEvent.click(screen.getByText('multh'));

        expect(window.localStorage.setItem).toHaveBeenLastCalledWith('userSettings', '{"notAdmin":{"mulitplierUnit":"multh","tablePageLength":"10"}}')

    });

});
