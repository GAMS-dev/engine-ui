import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault, suppressActWarnings } from './utils/testUtils'

import NamespacePermissionSelector from '../components/NamespacePermissionSelector'
import axios from 'axios';

jest.mock('axios');

describe('NamespacePermissionSelector', () => {
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
    it('renders NamespacePermissionSelector correctly', async () => {
        render(<NamespacePermissionSelector namespacePermissions={[{ name: 'global', permission: 110 }]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText('Namespace'));
    });

    it('should display the tooltip on hover', async () => {
        render(<NamespacePermissionSelector namespacePermissions={[{ name: 'global', permission: 110 }]} />, {
            wrapper: AllProvidersWrapperDefault
        });
        const infoIcon = screen.getByText('Permissions').querySelector('svg');
        fireEvent.mouseEnter(infoIcon);
        expect(
            screen.getByText(
                new RegExp(
                    `Admin role required for namespace creation, deletion, and quota management.` +
                    `Read allows model data download.` +
                    `Write allows model registration.` +
                    `Execute runs registered model jobs.` +
                    `Combine Write and Execute to run any model.`
                )
            )
        ).toBeInTheDocument();
    });

})
