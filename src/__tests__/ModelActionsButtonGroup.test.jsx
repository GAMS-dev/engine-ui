import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';
import AlertContext from '../contexts/AlertContext';

import ModelActionsButtonGroup from '../components/ModelActionsButtonGroup';

vi.mock('axios');

describe('ModelActionsButtonGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders ModelActionsButtonGroup correctly', async () => {
    render(<ModelActionsButtonGroup namespace={{ permission: 110 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText('Download'));
    await user.click(screen.getByText(/Delete/));
    expect(
      screen.getByText(/Are you sure you want to delete the model:/),
    ).toBeInTheDocument();
  });

  it('does not show Download link without read permission', () => {
    render(<ModelActionsButtonGroup namespace={{ permission: 2 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('does not show Update/Delete without write permission', () => {
    render(<ModelActionsButtonGroup namespace={{ permission: 4 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.queryByText('Update')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('cancel closes the confirm dialog', async () => {
    render(<ModelActionsButtonGroup namespace={{ permission: 2 }} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Please Confirm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });

  it('deletes the model successfully and refreshes', async () => {
    axios.delete.mockResolvedValueOnce({ status: 200 });
    const setRefresh = vi.fn();

    render(
      <ModelActionsButtonGroup
        id="mymodel"
        namespace={{ name: 'myns', permission: 2 }}
        server="testserver"
        setRefresh={setRefresh}
      />,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
    expect(axios.delete).toHaveBeenCalledWith(
      'testserver/namespaces/myns/models/mymodel',
      {},
    );
    expect(setRefresh).toHaveBeenCalled();
  });

  it('shows an alert message when deleting the model fails', async () => {
    axios.delete.mockRejectedValueOnce(new Error('Test error'));
    const setAlertMsg = vi.fn();

    render(
      <AlertContext.Provider value={['', setAlertMsg]}>
        <ModelActionsButtonGroup
          id="mymodel"
          namespace={{ name: 'myns', permission: 2 }}
          server="testserver"
          setRefresh={vi.fn()}
        />
      </AlertContext.Provider>,
      {
        wrapper: AllProvidersWrapperDefault,
      },
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() =>
      expect(setAlertMsg).toHaveBeenCalledWith(
        'Problems deleting model. Error message: Test error',
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText('Please Confirm')).not.toBeInTheDocument(),
    );
  });
});
