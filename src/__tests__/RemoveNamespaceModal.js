import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import RemoveNamespaceModal from '../components/RemoveNamespaceModal'

jest.mock('axios');

describe('RemoveNamespaceModal', () => {
    suppressActWarnings()

    it('renders RemoveNamespaceModal correctly', async () => {
        render(<RemoveNamespaceModal showDialog={true} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Please Confirm'));
    });

})
