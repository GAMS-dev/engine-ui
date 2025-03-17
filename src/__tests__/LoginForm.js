import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'
import axios from 'axios';
import LoginForm from '../components/LoginForm';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ login: false }}>
        {children}
    </AllProvidersWrapperDefault>
);

describe('LoginForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case '/api/auth/providers':
                    return Promise.resolve({
                        status: 200, data: []
                    })
                case '/api/auth/password-policy':
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
                case '/api/users/invitation/123456789012345678901234567890123456':
                    return Promise.resolve({
                        status: 200, data: {
                            identity_provider: "gams_engine"
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders LoginForm correctly', async () => {
        render(<LoginForm />, {
            wrapper: AllProvidersWrapper
        });
    });

    it('displays maintenance alert correctly', async () => {
        axios.get.mockRejectedValueOnce({
            response: {
                status: 503,
                data: {
                    message: "Under maintenance",
                    maintenance_mode: true
                }
            }
        })
        render(<LoginForm />, {
            wrapper: AllProvidersWrapper
        });
        await waitFor(() => screen.findByText(/GAMS Engine is under maintenance./));
    });

    it('shows the correct password policy helper text', async () => {
        render(<LoginForm />, {
            wrapper: AllProvidersWrapper
        });
        fireEvent.click(screen.getByText('Register'))
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '123456789012345678901234567890123456' } })
        await waitFor(() => screen.findByText(/Username/));
        const inputGroup = screen.getByLabelText('Password').closest('.input-group');
        const svgElements = inputGroup.querySelectorAll('svg');
        const infoIcon = svgElements[1];

        fireEvent.mouseEnter(infoIcon);
        expect(screen.getByText("The minimum password length is 20. Must contain at least one uppercase letter, lowercase letter, number and special character. It is checked against commonly used passwords.")).toBeInTheDocument();
    });
})
