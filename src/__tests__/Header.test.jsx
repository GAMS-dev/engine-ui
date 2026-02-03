import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'

import Header from '../components/Header'

vi.mock('axios');

describe('Header', () => {

    it('renders Header correctly', async () => {
        render(<Header isAdmin={true} licenseExpiration={'perpetual'} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await expect(screen.getByText('Perpetual license')).toBeInTheDocument()
    });

})
