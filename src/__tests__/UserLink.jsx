import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import UserLink from '../components/UserLink'

describe('UserLink', () => {
    suppressActWarnings()

    it('renders UserLink correctly', async () => {
        render(<UserLink user='admin' />, {
            wrapper: AllProvidersWrapperDefault
        });
        expect(screen.getByText('admin').closest('a')).toHaveAttribute('href', '/users/admin')
    });

    it('shows me badge', async () => {
        render(<UserLink user='admin' />, {
            wrapper: AllProvidersWrapperDefault
        });
        expect(screen.getByText('me')).toBeInTheDocument()
    });

    it('does not show me badge if hideMeBadge={true}', async () => {
        render(<UserLink user='admin' hideMeBadge={true} />, {
            wrapper: AllProvidersWrapperDefault
        });
        expect(screen.queryByText('me')).toBeNull();
    });

    it('does not show me badge if not me', async () => {
        render(<UserLink user='user1' hideMeBadge={true} />, {
            wrapper: AllProvidersWrapperDefault
        });
        expect(screen.queryByText('me')).toBeNull();
    });


})
