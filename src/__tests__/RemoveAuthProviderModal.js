import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import RemoveAuthProviderModal from '../components/RemoveAuthProviderModal'

jest.mock('axios');

describe('RemoveAuthProviderModal', () => {
    suppressActWarnings()

    it('renders RemoveAuthProviderModal correctly', async () => {
        render(<RemoveAuthProviderModal showDialog={true} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Please Confirm'));
    });

})
