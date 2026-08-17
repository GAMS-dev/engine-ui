import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import Header from '../components/Header';

vi.mock('axios');

describe('Header', () => {
  it('renders Header correctly', async () => {
    render(<Header isAdmin={true} licenseExpiration={'perpetual'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await expect(screen.getByText('Perpetual license')).toBeInTheDocument();
  });

  it('shows "No license" for a value that matches none of the known states, instead of a stale previous status', async () => {
    const { rerender } = render(
      <Header isAdmin={true} licenseExpiration={'perpetual'} />,
      { wrapper: AllProvidersWrapperDefault },
    );
    expect(screen.getByText('Perpetual license')).toBeInTheDocument();

    // licenseExpiration becomes something other than 'perpetual', a date
    // string, or null (e.g. reset to its default while a refetch is in
    // flight) - license status must not keep showing the old value.
    rerender(<Header isAdmin={true} licenseExpiration={undefined} />);
    expect(screen.getByText('No license')).toBeInTheDocument();
    expect(screen.queryByText('Perpetual license')).not.toBeInTheDocument();
  });

  it('shows the number of days remaining for a future expiration date', async () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    render(
      <Header isAdmin={true} licenseExpiration={futureDate.toISOString()} />,
      { wrapper: AllProvidersWrapperDefault },
    );
    expect(
      screen.getByText(/License expires in: \d+ days/),
    ).toBeInTheDocument();
  });

  it('shows "License expired" for a past expiration date', async () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    render(
      <Header isAdmin={true} licenseExpiration={pastDate.toISOString()} />,
      { wrapper: AllProvidersWrapperDefault },
    );
    expect(screen.getByText('License expired')).toBeInTheDocument();
  });

  it('shows nothing license-related for a non-admin user', () => {
    render(<Header isAdmin={false} licenseExpiration={'perpetual'} />, {
      wrapper: AllProvidersWrapperDefault,
    });
    expect(screen.queryByText('Perpetual license')).not.toBeInTheDocument();
  });
});
