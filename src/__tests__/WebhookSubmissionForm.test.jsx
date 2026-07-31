import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import axios from 'axios';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import WebhookSubmissionForm from '../components/WebhookSubmissionForm';

vi.mock('axios');

const routes = [
  { path: '/webhooks', element: <p>after submit went to webhooks list</p> },
];

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault options={{ routes: routes }}>
    {children}
  </AllProvidersWrapperDefault>
);

describe('WebhookSubmissionForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders WebhookSubmissionForm correctly', async () => {
    render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Add new Webhook/));
  });

  it('submits successfully with defaults and navigates to the webhooks list', async () => {
    axios.post.mockResolvedValue({ status: 200 });
    render(<WebhookSubmissionForm />, { wrapper: AllProvidersWrapper });

    await user.click(screen.getByRole('button', { name: 'Add Webhook' }));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post).toHaveBeenCalledWith(
      'testserver/users/webhooks',
      expect.anything(),
    );
    await waitFor(() =>
      screen.findByText(/after submit went to webhooks list/),
    );
  });

  it('marks the URL field invalid for a non-http protocol and blocks submission', async () => {
    const { container } = render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const urlInput = container.querySelector('#url');
    await user.type(urlInput, 'ftp://example.com');
    expect(urlInput).toHaveClass('is-invalid');

    await user.click(screen.getByRole('button', { name: 'Add Webhook' }));
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('marks the URL field invalid for an unparseable value', async () => {
    const { container } = render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const urlInput = container.querySelector('#url');
    await user.type(urlInput, 'not a url');
    expect(urlInput).toHaveClass('is-invalid');
    expect(screen.queryByLabelText(/Disable SSL certificate/)).toBeNull();
  });

  it('shows the insecure ssl checkbox for https urls and allows toggling it', async () => {
    const { container } = render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    const urlInput = container.querySelector('#url');
    await user.type(urlInput, 'https://example.com');
    expect(urlInput).not.toHaveClass('is-invalid');

    const checkbox = await screen.findByLabelText(
      /Disable SSL certificate validation/,
    );
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('requires at least one event before submitting', async () => {
    render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await user.click(screen.getByLabelText(/Remove All events/i));

    await user.click(screen.getByRole('button', { name: 'Add Webhook' }));

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('shows field-level validation errors returned by the server', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: {
          errors: {
            url: 'Invalid URL',
            secret: 'Secret too short',
            events: 'Invalid events',
          },
        },
      },
    });
    render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await user.click(screen.getByRole('button', { name: 'Add Webhook' }));

    await waitFor(() =>
      screen.findByText('Problems creating webhook instance.'),
    );
    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
    expect(screen.getByText('Secret too short')).toBeInTheDocument();
  });

  it('shows a generic error message when the request fails without field errors', async () => {
    axios.post.mockRejectedValue(new Error('network down'));
    render(<WebhookSubmissionForm />, {
      wrapper: AllProvidersWrapperDefault,
    });

    await user.click(screen.getByRole('button', { name: 'Add Webhook' }));

    await waitFor(() =>
      screen.findByText(
        /Problems creating webhook\. Error message: network down/,
      ),
    );
  });

  it('shows the invitee-specific recursive label for inviters', async () => {
    render(
      <AllProvidersWrapperDefault options={{ roles: ['inviter'] }}>
        <WebhookSubmissionForm />
      </AllProvidersWrapperDefault>,
    );
    await waitFor(() =>
      screen.findByText(/Register webhook for all your invitees as well\?/),
    );
  });

  it('does not show the recursive checkbox for regular users', async () => {
    render(
      <AllProvidersWrapperDefault options={{ roles: [] }}>
        <WebhookSubmissionForm />
      </AllProvidersWrapperDefault>,
    );
    await waitFor(() => screen.findByText(/Add new Webhook/));
    expect(screen.queryByText(/Register webhook/)).toBeNull();
  });
});
