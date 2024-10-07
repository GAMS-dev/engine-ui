import React from 'react';
import { render, screen} from '@testing-library/react';
import { MemoryRouter} from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import { UserSettingsContext } from '../components/UserSettingsContext';
import axios from 'axios';
import UserQuotaUpdateForm from '../components/UserQuotaUpdateForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const AuthProviderWrapper = ({ children }) => (
    <UserSettingsContext.Provider value={[{ _version: 1, quotaUnit: "$", multiplierUnit: "¢/s", quotaConversionFactor: 100, tablePageLength: "10" }]}>
        <MemoryRouter>
            <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>
                {children}
            </AuthContext.Provider>
        </MemoryRouter>
    </UserSettingsContext.Provider>
);

describe('UserQuotaUpdateForm', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ userToEdit: 'user1' })
        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
                case 'testserver/usage/quota':
                    if (params?.username === "user1") {
                        return Promise.resolve({
                            status: 200,
                            data: [
                                {
                                    "username": "user1",
                                    "parallel_quota": 10,
                                    "volume_quota": 1000,
                                    "volume_used": 0,
                                    "disk_quota": null,
                                    "disk_used": null
                                }
                            ]
                        })
                    } else if (params?.username === "admin") {
                        return Promise.resolve({
                            status: 200,
                            data: [{
                                "username": "admin",
                                "parallel_quota": "infinity",
                                "volume_quota": "infinity",
                                "volume_used": 10,
                                "disk_quota": "infinity",
                                "disk_used": null
                            }]
                        })
                    }
                    else {
                        return Promise.reject(new Error('not found'))
                    }
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

    it('renders UserQuotaUpdateForm corectly', async () => {
        render(<UserQuotaUpdateForm />, {
            wrapper: AuthProviderWrapper
        });
    });

    // it('renders UserQuotaUpdateForm corectly', async () => {
    //     render(<UserQuotaUpdateForm />, {
    //         wrapper: AuthProviderWrapper
    //     });
    //     await waitFor(() => screen.findByText(/Inherit/))
    //     fireEvent.click(screen.getByRole("checkbox"))
    //     await waitFor(() => screen.findByText(/Parallel/))
    //     screen.debug()
    // });
})
