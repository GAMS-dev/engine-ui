import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllProvidersWrapperDefault } from './utils/testUtils';

import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import ParameterizedWebhookEventsSelector from '../components/ParameterizedWebhookEventsSelector';

const AllProvidersWrapper = (options) => {
  const Wrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={options}>
      {children}
    </AllProvidersWrapperDefault>
  );
  return Wrapper;
};

describe('UserSettingsForm', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders ParameterizedWebhookEventsSelector', async () => {
    render(<ParameterizedWebhookEventsSelector parameterizedEvents={[]} />, {
      wrapper: AllProvidersWrapper(),
    });
  });

  it('ParameterizedWebhookEventsSelector is depend on quotaFormat 1', () => {
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: 'h' }),
      },
    );
    expect(
      screen.getByText('Volume quota threshold reached'),
    ).toBeInTheDocument();
    const quotaThresholdInput = screen.getByRole('spinbutton');
    expect(quotaThresholdInput).toHaveClass('form-control');
    expect(quotaThresholdInput).toHaveValue(1);
    expect(
      screen.getByPlaceholderText('Event trigger (in h)'),
    ).toBeInTheDocument();
  });

  it('ParameterizedWebhookEventsSelector is depend on quotaFormat 2', async () => {
    const mockSetEvents = vi.fn();
    const mockSetIsValid = vi.fn();
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
        setParameterizedEvents={mockSetEvents}
        setIsValid={mockSetIsValid}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: '$' }),
      },
    );
    expect(
      screen.getByText('Volume quota threshold reached'),
    ).toBeInTheDocument();
    const quotaThresholdInput = screen.getByRole('spinbutton');
    expect(quotaThresholdInput).toHaveClass('form-control');
    expect(quotaThresholdInput).toHaveValue(36);
    await user.click(
      screen.getByRole('button', { name: 'Add parameterized event' }),
    );
    expect(mockSetEvents).toHaveBeenCalledWith([
      'VOLUME_QUOTA_THRESHOLD=3600',
      'VOLUME_QUOTA_THRESHOLD=',
    ]);
    expect(mockSetIsValid).toHaveBeenCalledWith(false);
    expect(
      screen.getByPlaceholderText('Event trigger (in $)'),
    ).toBeInTheDocument();
  });

  it('changes the event type when a different option is selected', async () => {
    const mockSetEvents = vi.fn();
    const mockSetIsValid = vi.fn();
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
        setParameterizedEvents={mockSetEvents}
        setIsValid={mockSetIsValid}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: 'h' }),
      },
    );

    await selectEvent.select(
      screen.getByRole('combobox'),
      'Job duration threshold reached',
    );

    expect(mockSetEvents).toHaveBeenCalledWith(['JOB_DURATION_THRESHOLD=']);
    expect(mockSetIsValid).toHaveBeenCalledWith(false);
  });

  it('converts a typed value using the quota conversion factor for VOLUME_QUOTA_THRESHOLD events', () => {
    const mockSetEvents = vi.fn();
    const mockSetIsValid = vi.fn();
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
        setParameterizedEvents={mockSetEvents}
        setIsValid={mockSetIsValid}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: '$' }),
      },
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '5' } });

    // quotaConversionFactor for '$' is 100, so 5 * 100 = 500
    expect(mockSetEvents).toHaveBeenCalledWith(['VOLUME_QUOTA_THRESHOLD=500']);
    expect(mockSetIsValid).toHaveBeenCalledWith(true);
  });

  it('converts a typed value using seconds-per-hour for non-volume events', () => {
    const mockSetEvents = vi.fn();
    const mockSetIsValid = vi.fn();
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['JOB_DURATION_THRESHOLD=7200']}
        setParameterizedEvents={mockSetEvents}
        setIsValid={mockSetIsValid}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: 'h' }),
      },
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3' } });

    // 3 hours -> 3 * 3600 seconds
    expect(mockSetEvents).toHaveBeenCalledWith([
      'JOB_DURATION_THRESHOLD=10800',
    ]);
    expect(mockSetIsValid).toHaveBeenCalledWith(true);
  });

  it('marks the form invalid and skips conversion when the typed value is not a number', () => {
    const mockSetEvents = vi.fn();
    const mockSetIsValid = vi.fn();
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=3600']}
        setParameterizedEvents={mockSetEvents}
        setIsValid={mockSetIsValid}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: '$' }),
      },
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });

    expect(mockSetIsValid).toHaveBeenCalledWith(false);
    expect(mockSetEvents).toHaveBeenCalledWith(['VOLUME_QUOTA_THRESHOLD=NaN']);
  });

  it('removes the corresponding event when the close button is clicked', async () => {
    const mockSetEvents = vi.fn();
    const mockSetIsValid = vi.fn();
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={[
          'VOLUME_QUOTA_THRESHOLD=3600',
          'JOB_DURATION_THRESHOLD=7200',
        ]}
        setParameterizedEvents={mockSetEvents}
        setIsValid={mockSetIsValid}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: '$' }),
      },
    );

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[0]);

    expect(mockSetEvents).toHaveBeenCalledWith(['JOB_DURATION_THRESHOLD=7200']);
    expect(mockSetIsValid).toHaveBeenCalledWith(true);
  });

  it('hides the validation feedback element when validationErrors is empty', () => {
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={[]}
        validationErrors=""
      />,
      {
        wrapper: AllProvidersWrapper(),
      },
    );

    expect(
      screen.getByText((_, element) =>
        element.classList.contains('invalid-feedback'),
      ),
    ).toHaveStyle({ display: 'none' });
  });

  it('shows an empty, invalid input when an existing event has an unparseable parameter', () => {
    render(
      <ParameterizedWebhookEventsSelector
        parameterizedEvents={['VOLUME_QUOTA_THRESHOLD=notanumber']}
      />,
      {
        wrapper: AllProvidersWrapper({ quotaUnit: '$' }),
      },
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('is-invalid');
    expect(input).toHaveValue(null);
  });
});
