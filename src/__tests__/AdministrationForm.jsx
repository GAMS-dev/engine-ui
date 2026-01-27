import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import AdministrationForm from '../components/AdministrationForm'

vi.mock('axios');

describe('AdministrationForm', () => {
    suppressActWarnings()

    it('renders AdministrationForm correctly', async () => {
        render(<AdministrationForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Administration/));
    });

})
