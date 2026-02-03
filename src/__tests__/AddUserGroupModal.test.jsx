import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { AllProvidersWrapperDefault } from './utils/testUtils'
import axios from 'axios';

import AddUserGroupModal from '../components/AddUserGroupModal'

vi.mock('axios');

describe('AddUserGroupModal', () => {

    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders AddUserGroupModal correctly', async () => {
        render(<AddUserGroupModal showDialog="true" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add User Group/));
    });

    it('sends the correct request', async () => {
        const mockSetShowDialog = vi.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AllProvidersWrapperDefault
        });
        const input = screen.getByRole("textbox", { name: 'Group Label' });
        await user.type(input, 'newGroup');
        const addButton = screen.getByRole("button", { name: /add group/i });
        await user.click(addButton);
        expect(axios.post).toBeCalledWith('testserver/namespaces/testNamespace/user-groups',
            null,
            { "params": { "label": "newGroup" } }
        );
    });

    it('closes and does not call put if canceled', async () => {
        const mockSetShowDialog = vi.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        await user.click(screen.getByRole("button", { name: /cancel/i }));
        expect(mockSetShowDialog).toBeCalledWith(false);
        expect(axios.post).toHaveBeenCalledTimes(0);
    });

    it('closes and does not call put if closed', async () => {
        const mockSetShowDialog = vi.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        await user.click(screen.getByRole("button", { name: /close/i }));
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

        const mockSetShowDialog = vi.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        const input = screen.getByRole("textbox", { name: /group label/i });
        await user.type(input, 'newGroup');
        await user.click(screen.getByRole("button", { name: /add group/i }));

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

        const mockSetShowDialog = vi.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        const input = screen.getByRole("textbox", { name: /Group Label/ });
        await user.type(input, 'newGroup');
        await user.click(screen.getByRole("button", { name: /add group/i }));

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

        const mockSetShowDialog = vi.fn();

        render(<AddUserGroupModal showDialog={true} setShowDialog={mockSetShowDialog} namespace="testNamespace" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Add User Group/));
        const input = screen.getByRole("textbox", { name: 'Group Label' })
        await user.type(input, 'newGroup');
        await user.click(screen.getByRole("button", { name: 'Add Group' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/testNamespace/user-groups',
            null,
            { "params": { "label": "newGroup" } }
        );
        await waitFor(() => screen.findByText(/some error/));
        expect(screen.getByText('some error occurred')).toBeInTheDocument()
    });

})
