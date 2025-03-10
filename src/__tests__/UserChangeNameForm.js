import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserChangeNameForm from '../components/UserChangeNameForm'

jest.mock('axios');
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

describe('UserChangeNameForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ user: 'user1' })
    })

    it('renders UserChangeNameForm correctly', async () => {
        render(<UserChangeNameForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Change Username of User: user1'));
    });

})
