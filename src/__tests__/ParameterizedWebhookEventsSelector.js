import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
    AllProvidersWrapperDefault,
    suppressActWarnings,
} from './utils/testUtils'

import ParameterizedWebhookEventsSelector from '../components/ParameterizedWebhookEventsSelector'

const AllProvidersWrapper =
    (options) =>
    ({ children }) =>
        (
            <AllProvidersWrapperDefault options={options}>
                {children}
            </AllProvidersWrapperDefault>
        )

describe('UserSettingsForm', () => {
    suppressActWarnings()

    it('renders ParameterizedWebhookEventsSelector', () => {
        render(
            <ParameterizedWebhookEventsSelector parameterizedEvents={[]} />,
            {
                wrapper: AllProvidersWrapper,
            }
        )
    })

    it('ParameterizedWebhookEventsSelector is depent on quotaFormat 1', () => {
        render(
            <ParameterizedWebhookEventsSelector
                parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
            />,
            {
                wrapper: AllProvidersWrapper({ quotaUnit: 'h' }),
            }
        )
        expect(
            screen.getByText('Volume quota threshold reached')
        ).toBeInTheDocument()
        const quotaThresholdInput = screen.getByRole('spinbutton')
        expect(quotaThresholdInput).toHaveClass('form-control')
        expect(quotaThresholdInput).toHaveValue(1)
        expect(
            screen.getByPlaceholderText('Event trigger (in h)')
        ).toBeInTheDocument()
    })
    it('ParameterizedWebhookEventsSelector is depent on quotaFormat 2', () => {
        const mockSetEvents = jest.fn()
        const mockSetIsValid = jest.fn()
        render(
            <ParameterizedWebhookEventsSelector
                parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
                setParameterizedEvents={mockSetEvents}
                setIsValid={mockSetIsValid}
            />,
            {
                wrapper: AllProvidersWrapper({ quotaUnit: '$' }),
            }
        )
        expect(
            screen.getByText('Volume quota threshold reached')
        ).toBeInTheDocument()
        const quotaThresholdInput = screen.getByRole('spinbutton')
        expect(quotaThresholdInput).toHaveClass('form-control')
        expect(quotaThresholdInput).toHaveValue(36)
        fireEvent.click(
            screen.getByRole('button', { name: 'Add parameterized event' })
        )
        expect(mockSetEvents).toHaveBeenCalledWith([
            'VOLUME_QUOTA_THRESHOLD=3600',
            'VOLUME_QUOTA_THRESHOLD=',
        ])
        expect(mockSetIsValid).toHaveBeenCalledWith(false)
        expect(
            screen.getByPlaceholderText('Event trigger (in $)')
        ).toBeInTheDocument()
    })
})
