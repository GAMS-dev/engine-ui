import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { within } from '@testing-library/dom'
import { MemoryRouter, Route, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { AuthContext } from '../AuthContext';
import { ServerInfoContext } from "../ServerInfoContext";
import { UserSettingsContext } from '../components/UserSettingsContext';
import UserEditBundle from '../components/UserEditBundle';
import { testDatax } from './utils/testData';
import axios from 'axios';
import { log, error } from "console";

jest.mock('axios');

window.ResizeObserver = function () {
    return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    };
};

const ContextsWrapper = ({ children }) => (
    <UserSettingsContext.Provider value={[{
        quotaUnit: 'mults',
        tablePageLength: 10
    }, () => { }]}>
        <ServerInfoContext.Provider value={[{in_kubernetes:true}, () => { }]}>
            <AuthContext.Provider value={[{ username: "admin", roles: ["admin", "inviter"], server: "testserver" }]}>
                {children}
            </AuthContext.Provider>
        </ServerInfoContext.Provider>
    </UserSettingsContext.Provider>
);


jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: () => ({
        userToEdit: 'user1',
    })
}));

describe('UserEditBundle', () => {

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            log(url)
            switch (url) {
                case 'testserver/usage/':
                    return Promise.resolve({ status: 200, data: testDatax.test_single_job })
                case 'testserver/users/':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                "username": "user1",
                                "roles": [],
                                "deleted": false,
                                "old_username": "test1",
                                "inviter_name": "admin",
                                "invitation_time": "2024-04-15T12:45:39.866973+00:00",
                                "identity_provider": "gams_engine",
                                "identity_provider_user_subject": "user1"
                            }]
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

    it('provides expected UserSettingsContext obj to child elements', async () => {
        render(
            <MemoryRouter initialEntries={['/usage']}>
                <UserEditBundle />
            </MemoryRouter>
            , {
                wrapper: ContextsWrapper
            });
    });

    it('opens the correct tap, dependent on the given path', async () => {
        render(
            <MemoryRouter initialEntries={['/usage/timeline']}>
                <UserEditBundle />
            </MemoryRouter>
            , {
                wrapper: ContextsWrapper
            });
        await waitFor(() => screen.findByText(/Password/));
        fireEvent.click(screen.getByText(/Password/));
        screen.debug()
        await waitFor(() => screen.findByText(/Confirm/));

    });

})
