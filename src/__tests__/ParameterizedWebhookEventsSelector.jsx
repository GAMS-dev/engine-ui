import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import {
    AllProvidersWrapperDefault,
} from './utils/testUtils';

import userEvent from '@testing-library/user-event';
import ParameterizedWebhookEventsSelector from '../components/ParameterizedWebhookEventsSelector';

const AllProvidersWrapper =
    (options) => {
        const Wrapper = ({ children }) =>
        (
            <AllProvidersWrapperDefault options={options}>
                {children}
            </AllProvidersWrapperDefault>
        )
        return Wrapper
    }

describe('UserSettingsForm', () => {
    let user;

    beforeEach(() => {
        user = userEvent.setup();
    });

    it('renders ParameterizedWebhookEventsSelector', async() => {
        render(
            <ParameterizedWebhookEventsSelector parameterizedEvents={[]} />,
            {
                wrapper: AllProvidersWrapper(),
            }
        )
    })

    it('ParameterizedWebhookEventsSelector is depend on quotaFormat 1', () => {
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

    it('ParameterizedWebhookEventsSelector is depend on quotaFormat 2', async () => {
        const mockSetEvents = vi.fn()
        const mockSetIsValid = vi.fn()
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
        await user.click(
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
