import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import LoginForm from '../components/LoginForm';
import { AllProvidersWrapperDefault } from './utils/testUtils';

vi.mock('axios');

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

const AllProvidersWrapper = ({ children }) => (
  <AllProvidersWrapperDefault options={{ login: false }}>
    {children}
  </AllProvidersWrapperDefault>
);

describe('LoginForm', () => {
  let user;
  beforeEach(() => {
    user = userEvent.setup();

    axios.get.mockImplementation((url) => {
      switch (url) {
        case '/api/auth/providers':
          return Promise.resolve({
            status: 200,
            data: [],
          });
        case '/api/auth/password-policy':
          return Promise.resolve({
            status: 200,
            data: {
              min_password_length: 20,
              must_include_uppercase: true,
              must_include_lowercase: true,
              must_include_number: true,
              must_include_special_char: true,
              not_in_popular_passwords: true,
            },
          });
        case '/api/users/invitation/123456789012345678901234567890123456':
          return Promise.resolve({
            status: 200,
            data: {
              identity_provider: 'gams_engine',
            },
          });
        default:
          return Promise.reject(new Error('not found'));
      }
    });
  });

  it('renders LoginForm correctly', async () => {
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => screen.findByText(/Register/));
  });

  it('displays maintenance alert correctly', async () => {
    axios.get.mockRejectedValueOnce({
      response: {
        status: 503,
        data: {
          message: 'Under maintenance',
          maintenance_mode: true,
        },
      },
    });
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await waitFor(() => screen.findByText(/GAMS Engine is under maintenance./));
  });

  it('shows the correct password policy helper text', async () => {
    render(<LoginForm />, {
      wrapper: AllProvidersWrapper,
    });
    await user.click(screen.getByText('Register'));
    const input = screen.getByRole('textbox');
    await user.type(input, '123456789012345678901234567890123456');
    await waitFor(() => screen.findByText(/Username/));

    const inputGroup = screen
      .getByLabelText('Password')
      .closest('.input-group');
    const svgElements = inputGroup.querySelectorAll('svg');
    const infoIcon = svgElements[1];
    await user.hover(infoIcon);
    await screen.findByText(/The minimum password length is 20/);
    expect(
      screen.getByText(
        'The minimum password length is 20. Must contain at least one uppercase letter, lowercase letter, number and special character. It is checked against commonly used passwords.',
      ),
    ).toBeInTheDocument();
  });
});
