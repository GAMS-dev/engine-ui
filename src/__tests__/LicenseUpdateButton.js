import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AllProvidersWrapperDefault } from './utils/testUtils'
import LicUpdateButton from '../components/LicenseUpdateButton';
import axios from 'axios';



jest.mock('axios');

describe('LicUpdateButton', () => {

    beforeEach(() => {
        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/licenses/engine':
                    return Promise.resolve({
                        status: 200, data: {
                            "license": null,
                            "expiration_date": null,
                            "usi": "usiToken1234"
                        }
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    const originalError = console.error
    beforeAll(() => {

        console.error = (...args) => {
            if (/Warning.*not wrapped in act/.test(args[0])) {
                return
            }
            originalError.call(console, ...args)
        }
    })

    afterAll(() => {
        console.error = originalError
    })


    it('renders LicUpdateButton correctly', async () => {
        render(<LicUpdateButton type="engine" />, {
            wrapper: AllProvidersWrapperDefault
        });
    });


    it('renders the copy button in a secure context', async () => {
        Object.defineProperty(window, 'isSecureContext', {
            writable: true,
            value: true,
        });

        render(<LicUpdateButton type="engine" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Update Engine license/));
        fireEvent.click(screen.getByText(/Update Engine license/));

        expect(screen.getByRole("button", { name: 'Copy to clipboard' })).toBeInTheDocument();
    });

    it('does not render the copy button in an insecure context', async () => {
        Object.defineProperty(window, 'isSecureContext', {
            writable: true,
            value: false,
        });

        render(<LicUpdateButton type="engine" />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Update Engine license/));
        fireEvent.click(screen.getByText(/Update Engine license/));

        expect(screen.queryByRole("button", { name: 'Copy to clipboard' })).toBeNull();
    });
});
