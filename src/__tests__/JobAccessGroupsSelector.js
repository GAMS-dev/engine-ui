import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import JobAccessGroupsSelector from '../components/JobAccessGroupsSelector'
import axios from 'axios';

jest.mock('axios');

describe('JobAccessGroupsSelector', () => {
    suppressActWarnings()

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/namespaces/global/user-groups':
                    return Promise.resolve({
                        status: 200,
                        data: [
                            {
                                'label': 'string',
                                'created_at': '2021-08-04T17:10:15.000000+00:00',
                                'created_by': {
                                    'username': 'string',
                                    'deleted': true,
                                    'old_username': 'string'
                                },
                                'owned_by': 'string',
                                'members': [
                                    {
                                        'username': 'string',
                                        'added_at': '2021-08-04T17:10:15.000000+00:00',
                                        'added_by': {
                                            'username': 'string',
                                            'deleted': true,
                                            'old_username': 'string'
                                        }
                                    }
                                ]
                            }
                        ]
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders JobAccessGroupsSelector correctly', async () => {
        render(<JobAccessGroupsSelector namespace="global" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Select access groups/));
    });

})
