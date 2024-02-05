import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { within } from '@testing-library/dom'
import { AuthContext } from '../AuthContext';
import UpdatePasswordPolicyButton from '../components/UpdatePasswordPolicyButton';
import userEvent from '@testing-library/user-event';
import axios from 'axios';

jest.mock('axios');

window.ResizeObserver = function () {
    return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
    };
};

jest.doMock("../AuthContext", () => ({
    __esModule: true,
    default: React.createContext()
}));

const AuthProviderWrapper = ({ children }) => (
    <AuthContext.Provider value={[{ server: "http://localhost" }]}>
        {children}
    </AuthContext.Provider>
);


describe('test UpdatePasswordPolicyButton', () => {

    it('renders Button corectly', () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });
    });

    it('display default passwordPlociy on first use', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });
        fireEvent.click(screen.getByText('Update password policy'))
        await waitFor(() => screen.getByText('Include at least one number?'));

        expect(screen.getByRole('spinbutton', { name: 'Minimum password length:' }).value).toEqual('10');
        expect(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }).checked).toEqual(false);
        expect(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }).checked).toEqual(false);
        expect(screen.getByRole('checkbox', { name: 'Include at least one number?' }).checked).toEqual(false);
        expect(screen.getByRole('checkbox', { name: 'Include at least one special character?' }).checked).toEqual(false);
        expect(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }).checked).toEqual(false);

        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Update', type: 'submit' })).toBeInTheDocument();
    });

    it('displays correct passwordPolicy if set before', async () => {
        const passwordPlociy = {
            min_password_length: 20,
            must_include_uppercase: true,
            must_include_lowercase: true,
            must_include_number: true,
            must_include_special_char: true,
            not_in_popular_passwords: true,
        }
        axios.get.mockImplementation(() => Promise.resolve({ status: 200, data: passwordPlociy }));
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });

        fireEvent.click(screen.getByText('Update password policy'))
        await waitFor(() => screen.getByText('Include at least one number?'));

        expect(screen.getByRole('spinbutton', { name: 'Minimum password length:' }).value).toEqual('20');
        expect(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one number?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one special character?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }).checked).toEqual(true);
    });

    it('can click every checkbox', async () => {
        const result = render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });

        fireEvent.click(screen.getByText('Update password policy'))
        await waitFor(() => screen.getByText('Include at least one number?'));

        fireEvent.change(screen.getByLabelText('Minimum password length:'), {target: {value: '12'}});
        fireEvent.click(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Include at least one number?' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Include at least one special character?' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }));

        expect(screen.getByRole('spinbutton', { name: 'Minimum password length:' }).value).toEqual('12');
        expect(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one number?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one special character?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }).checked).toEqual(true);
    });

    it('pasword policy updates correctly', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });

        fireEvent.click(screen.getByText('Update password policy'))
        await waitFor(() => screen.getByText('Include at least one number?'));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Include at least one special character?' }));
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));
        await waitFor(() => screen.getByText('Update password policy'));

        expect(axios.put).toBeCalledWith(
            'http://localhost/auth/password-policy', {
            min_password_length: 10,
            must_include_uppercase: false,
            must_include_lowercase: false,
            must_include_number: false,
            must_include_special_char: true,
            not_in_popular_passwords: false
        });
        // check that the dialog is closed
        expect(screen.queryByRole('checkbox', { name: 'Include at least one uppercase letter?' })).toBeNull();
    });

    it('handles error while updating the password policy correctly (put)', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });

        axios.put.mockImplementation(() => Promise.reject(new Error('Test error')));

        fireEvent.click(screen.getByText('Update password policy'))
        fireEvent.click(screen.getByRole('button', { name: 'Update' }));
        await waitFor(() => screen.getByText("Couldn't set new password policy. Error message: Test error."));
    });

    it('close and cancle work', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AuthProviderWrapper
        });

        fireEvent.click(screen.getByText('Update password policy'))
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => screen.getByText('Update password policy'));

        fireEvent.click(screen.getByText('Update password policy'))
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => screen.getByText('Update password policy'));

        await expect(axios.put).toHaveBeenCalledTimes(0);
    });

});
