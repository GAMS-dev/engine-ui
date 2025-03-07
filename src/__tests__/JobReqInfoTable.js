import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import JobReqInfoTable from '../components/JobReqInfoTable'

jest.mock('axios');

describe('JobReqInfoTable', () => {
    suppressActWarnings()

    it('renders JobReqInfoTable correctly', async () => {
        const jobInfo = {
            access_groups: null,
            tag: null,
            token: "token123",
            user: { username: "user1", delete: false },
            arguments: [],
            text_entries: [],
            stream_entries: []
        }
        render(<JobReqInfoTable job={jobInfo} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Request/));
    });

})
