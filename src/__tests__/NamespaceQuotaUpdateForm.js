import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import NamespaceQuotaUpdateForm from '../components/NamespaceQuotaUpdateForm'
import axios from 'axios';

jest.mock('axios');

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
    useParams: jest.fn(),
}));

describe('NamespaceQuotaUpdateForm', () => {
    suppressActWarnings()

    beforeEach(() => {
        jest.spyOn(require('react-router-dom'), 'useParams').mockReturnValue({ namespace: 'global' })

        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/namespaces/global/disk-quota':
                    return Promise.resolve({
                        status: 200,
                        data: {
                            "name": "global",
                            "disk_quota": null,
                            "disk_use": 0
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })
    it('renders NamespaceQuotaUpdateForm correctly', async () => {
        render(<NamespaceQuotaUpdateForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Edit Disk Space Quota of Namespace: global'));
    });

})
