import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'
import axios from 'axios';

import AddNamespaceModal from '../components/AddNamespaceModal'


jest.mock('axios');

describe('AddNamespaceModal', () => {

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

    it('renders AddNamespaceModal correctly', async () => {
        render(<AddNamespaceModal showDialog="true" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Namespace Name/));
    });

    it('sends the correct request', async () => {
        const mockSetShowDialog = jest.fn();

        render(<AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Namespace Name/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Namespace Name' }), { target: { value: 'newNamespace' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Namespace' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/newNamespace');
    });

    it('does not send request if namespace already exists', async () => {
        const mockSetShowDialog = jest.fn();
        const existingNamespaces = ['thisNamespaceAlreadyExists']

        render(<AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} existingNamespaces={existingNamespaces} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Namespace Name/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Namespace Name' }), { target: { value: 'thisNamespaceAlreadyExists' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Namespace' }));
        expect(axios.post).toHaveBeenCalledTimes(0);
        expect(screen.getByText('The namespace you entered already exists. Please choose another name.')).toBeInTheDocument()
    });

    it('closes and does not call put if canceled', async () => {
        const mockSetShowDialog = jest.fn();

        render(<AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Namespace Name/));
        fireEvent.click(screen.getByRole("button", { name: 'Cancel' }));
        expect(mockSetShowDialog).toBeCalledWith(false);
        expect(axios.post).toHaveBeenCalledTimes(0);
    });

    it('closes and does not call put if closed', async () => {
        const mockSetShowDialog = jest.fn();

        render(<AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Namespace Name/));
        fireEvent.click(screen.getByRole("button", { name: 'Close' }));
        expect(mockSetShowDialog).toBeCalledWith(false);
        expect(axios.post).toHaveBeenCalledTimes(0);
    });


    it('displays error message if put does not work', async () => {
        axios.post.mockRejectedValue({
            response: {
                status: 400,
                data: {
                    message: 'some error occurred'
                }
            }
        })

        const mockSetShowDialog = jest.fn();

        render(<AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Namespace Name/));
        fireEvent.change(screen.getByRole("textbox", { name: 'Namespace Name' }), { target: { value: 'newNamespace' } });
        fireEvent.click(screen.getByRole("button", { name: 'Add Namespace' }));
        expect(axios.post).toBeCalledWith('testserver/namespaces/newNamespace');
        await waitFor(() => screen.findByText(/Some error/));
        expect(screen.getByText('Some error occurred while trying to add the namespace. Error message: some error occurred.')).toBeInTheDocument()
    });

})
