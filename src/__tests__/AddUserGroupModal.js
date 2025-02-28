import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'
import { AuthContext } from '../AuthContext';
import axios from 'axios';

import AddUserGroupModal from '../components/AddUserGroupModal'

const AuthProviderWrapper = ({ children }) => (
    <MemoryRouter>
        <AuthContext.Provider value={[{ username: "admin", roles: ["admin"], server: 'testserver' }]}>
            {children}
        </AuthContext.Provider>
    </MemoryRouter>
);

jest.mock('axios');

describe('AddUserGroupModal', () => {

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

    it('renders AddUserGroupModal correctly', async () => {
        render(<AddUserGroupModal showDialog="true" />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
    });

    it('sends the correct request', async () => {
        const mockSetShowDialog = jest.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Group Label' }), { target: { value: 'newGroup' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Group' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/testNamespace/user-groups',
            null,
            { "params": { "label": "newGroup" } }
        );
    });

    it('closes and does not call put if canceled', async () => {
        const mockSetShowDialog = jest.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        fireEvent.click(screen.getByRole("button", { name: 'Cancel' }));
        expect(mockSetShowDialog).toBeCalledWith(false);
        expect(axios.post).toHaveBeenCalledTimes(0);
    });

    it('closes and does not call put if closed', async () => {
        const mockSetShowDialog = jest.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        fireEvent.click(screen.getByRole("button", { name: 'Close' }));
        expect(mockSetShowDialog).toBeCalledWith(false);
        expect(axios.post).toHaveBeenCalledTimes(0);
    });


    it('displays error message if put does not work', async () => {
        axios.post.mockRejectedValue({
            response: {
                status: 404,
                data: {
                    message: 'some error occurred'
                }
            }
        })

        const mockSetShowDialog = jest.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Group Label' }), { target: { value: 'newGroup' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Group' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/testNamespace/user-groups',
            null,
            { "params": { "label": "newGroup" } }
        );
        await waitFor(() => screen.findByText(/Some error/));
        expect(screen.getByText('Some error occurred. Error message: some error occurred.')).toBeInTheDocument()
    });

    it('displays error message if put does not work', async () => {
        axios.post.mockRejectedValue({
            response: {
                status: 400,
                data: {
                    message: 'some error occurred',
                    errors: {
                        label: 'errorLabel'
                    }
                }
            }
        })

        const mockSetShowDialog = jest.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Group Label' }), { target: { value: 'newGroup' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Group' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/testNamespace/user-groups',
            null,
            { "params": { "label": "newGroup" } }
        );
        await waitFor(() => screen.findByText(/some error/));
        expect(screen.getByText('some error occurred')).toBeInTheDocument()
        expect(screen.getByText('errorLabel')).toBeInTheDocument()
    });

    it('displays error message if put does not work', async () => {
        axios.post.mockRejectedValue({
            response: {
                status: 400,
                data: {
                    message: 'some error occurred',
                    errors: {}
                }
            }
        })

        const mockSetShowDialog = jest.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AuthProviderWrapper
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Group Label' }), { target: { value: 'newGroup' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Group' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/testNamespace/user-groups',
            null,
            { "params": { "label": "newGroup" } }
        );
        await waitFor(() => screen.findByText(/some error/));
        expect(screen.getByText('some error occurred')).toBeInTheDocument()
    });

})
