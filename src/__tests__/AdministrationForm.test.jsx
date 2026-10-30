import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import AdministrationForm from '../components/AdministrationForm';

vi.mock('axios');

describe('AdministrationForm', () => {
  it('renders AdministrationForm correctly', async () => {
    render(<AdministrationForm />, {
      wrapper: AllProvidersWrapperDefault,
    });
    await waitFor(() => screen.findByText(/Administration/));
  });

  it.each([true, false])(
    'shows the job priorities toggle (in_kubernetes: %s)',
    async (in_kubernetes) => {
      render(<AdministrationForm />, {
        wrapper: ({ children }) => (
          <AllProvidersWrapperDefault options={{ in_kubernetes }}>
            {children}
          </AllProvidersWrapperDefault>
        ),
      });
      expect(
        await screen.findByRole('button', { name: /Enable job priorities/ }),
      ).toBeInTheDocument();
    },
  );
});
