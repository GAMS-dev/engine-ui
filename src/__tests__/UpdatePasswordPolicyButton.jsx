import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import React from 'react';
import UpdatePasswordPolicyButton from '../components/UpdatePasswordPolicyButton';
import { AllProvidersWrapperDefault } from './utils/testUtils';

vi.mock('axios');

vi.mock("../AuthContext", () => {
  return {
    AuthContext: React.createContext()
  };
});

describe('test UpdatePasswordPolicyButton', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();

        const passwordPolicy = {
            min_password_length: 10,
            must_include_uppercase: false,
            must_include_lowercase: false,
            must_include_number: false,
            must_include_special_char: false,
            not_in_popular_passwords: false,
        }
        axios.get.mockImplementation(() => Promise.resolve({ status: 200, data: passwordPolicy }));
    });

    it('renders Button correctly', () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AllProvidersWrapperDefault
        });
    });

    it('display default passwordPolicy on first use', async () => {

        render(<UpdatePasswordPolicyButton />, {
            wrapper: AllProvidersWrapperDefault
        });

        fireEvent.click(screen.getByText('Update password policy'));
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
        const passwordPolicy = {
            min_password_length: 20,
            must_include_uppercase: true,
            must_include_lowercase: true,
            must_include_number: true,
            must_include_special_char: true,
            not_in_popular_passwords: true,
        }
        axios.get.mockImplementation(() => Promise.resolve({ status: 200, data: passwordPolicy }));
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AllProvidersWrapperDefault
        });

        await user.click(screen.getByText('Update password policy'))
        await waitFor(() => screen.getByText('Include at least one number?'));

        expect(screen.getByRole('spinbutton', { name: 'Minimum password length:' }).value).toEqual('20');
        expect(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one number?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one special character?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }).checked).toEqual(true);
    });

    it('can click every checkbox', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AllProvidersWrapperDefault
        });

        await user.click(screen.getByText('Update password policy'));
        await waitFor(() => screen.getByText('Include at least one number?'));

        const input = screen.getByLabelText('Minimum password length:');

        fireEvent.change(input, { target: { value: '12' } });

        await user.click(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }));
        await user.click(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }));
        await user.click(screen.getByRole('checkbox', { name: 'Include at least one number?' }));
        await user.click(screen.getByRole('checkbox', { name: 'Include at least one special character?' }));
        await user.click(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }));

        expect(screen.getByRole('spinbutton', { name: 'Minimum password length:' }).value).toEqual('12');
        expect(screen.getByRole('checkbox', { name: 'Include at least one uppercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one lowercase letter?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one number?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Include at least one special character?' }).checked).toEqual(true);
        expect(screen.getByRole('checkbox', { name: 'Check if the password is commonly used?' }).checked).toEqual(true);
    });

    it('password policy updates correctly', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AllProvidersWrapperDefault
        });

        await user.click(screen.getByText('Update password policy'))
        await waitFor(() => screen.getByText('Include at least one number?'));
        await user.click(screen.getByRole('checkbox', { name: 'Include at least one special character?' }));
        await user.click(screen.getByRole('button', { name: 'Update' }));
        await waitFor(() => screen.getByText('Update password policy'));

        expect(axios.put).toBeCalledWith(
            'testserver/auth/password-policy', {
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
            wrapper: AllProvidersWrapperDefault
        });

        axios.put.mockImplementation(() => Promise.reject(new Error('Test error')));

        await user.click(screen.getByText('Update password policy'))
        await user.click(screen.getByRole('button', { name: 'Update' }));
        await waitFor(() => screen.getByText("Couldn't set new password policy. Error message: Test error."));
    });

    it('close and cancel work', async () => {
        render(<UpdatePasswordPolicyButton />, {
            wrapper: AllProvidersWrapperDefault
        });

        await user.click(screen.getByText('Update password policy'))
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() => screen.getByText('Update password policy'));

        await user.click(screen.getByText('Update password policy'))
        await user.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => screen.getByText('Update password policy'));

        await expect(axios.put).toHaveBeenCalledTimes(0);
    });

});
