import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import AddNamespaceModal from '../components/AddNamespaceModal';

vi.mock('axios');

describe('AddNamespaceModal', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders AddNamespaceModal correctly', async () => {
    render(<AddNamespaceModal showDialog="true" />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Namespace Name/));
  });

  it('sends the correct request', async () => {
    const mockSetShowDialog = vi.fn();

    render(
      <AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    const input = await screen.findByRole('textbox', {
      name: 'Namespace Name',
    });
    await user.type(input, 'newNamespace');
    await user.click(screen.getByRole('button', { name: 'Add Namespace' }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'testserver/namespaces/newNamespace',
      );
    });
  });

  it('does not send request if namespace already exists', async () => {
    const mockSetShowDialog = vi.fn();
    const existingNamespaces = ['thisNamespaceAlreadyExists'];

    render(
      <AddNamespaceModal
        showDialog={true}
        setShowDialog={mockSetShowDialog}
        existingNamespaces={existingNamespaces}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    const input = await screen.findByRole('textbox', {
      name: 'Namespace Name',
    });
    await user.type(input, 'thisNamespaceAlreadyExists');
    await user.click(screen.getByRole('button', { name: 'Add Namespace' }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(0);
    });
    expect(
      screen.getByText(
        'The namespace you entered already exists. Please choose another name.',
      ),
    ).toBeInTheDocument();
  });

  it('closes and does not call put if canceled', async () => {
    const mockSetShowDialog = vi.fn();

    render(
      <AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );

    await screen.findByText(/Namespace Name/);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(mockSetShowDialog).toBeCalledWith(false);
    expect(axios.post).toHaveBeenCalledTimes(0);
  });

  it('closes and does not call put if closed', async () => {
    const mockSetShowDialog = vi.fn();

    render(
      <AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await screen.findByText(/Namespace Name/);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(mockSetShowDialog).toBeCalledWith(false);
    expect(axios.post).toHaveBeenCalledTimes(0);
  });

  it('displays error message if put does not work', async () => {
    axios.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: 'some error occurred',
        },
      },
    });

    const mockSetShowDialog = vi.fn();

    render(
      <AddNamespaceModal showDialog={true} setShowDialog={mockSetShowDialog} />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    const input = await screen.findByRole('textbox', {
      name: 'Namespace Name',
    });
    await user.type(input, 'newNamespace');
    await user.click(screen.getByRole('button', { name: 'Add Namespace' }));
    expect(axios.post).toBeCalledWith('testserver/namespaces/newNamespace');
    await waitFor(() => screen.findByText(/Some error/));
    expect(
      screen.getByText(
        'Some error occurred while trying to add the namespace. Error message: some error occurred.',
      ),
    ).toBeInTheDocument();
  });
});
