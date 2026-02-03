import { render, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import { AllProvidersWrapperDefault } from './utils/testUtils'
import axios from 'axios';

import Job from '../components/Job'

vi.mock('axios');

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...actual,
        useParams: vi.fn(),
    }
})

import { useParams } from 'react-router-dom'

describe('Job', () => {

    beforeEach(() => {
        vi.mocked(useParams).mockReturnValue({
            token: 'asd123',
        })

        axios.get.mockRejectedValue({
            status: 404,
        })

        // Mock the CancelToken source and axios get method
        const cancel = vi.fn();
        axios.isCancel = vi.fn();

        // You can also mock CancelToken source if needed
        axios.CancelToken.source = vi.fn(() => ({
            token: { cancel },
            cancel,
        }));
    })

    it('renders Job correctly', async () => {
        render(<Job />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Problems fetching job information. Error message: undefined/));
    });

    it('gives the correct error message if an invalid token is called', async () => {
        vi.mocked(useParams).mockReturnValue({
            token: 'invalidToken123',
        })

        render(<Job />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Problems fetching job information. Error message: undefined/));
    });

    it('gives the correct error message if an invalid token is called also for hybercube', async () => {
        vi.mocked(useParams).mockReturnValue({
            token: 'hc:invalidToken123',
        })

        render(<Job />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Problems fetching Hypercube job information. Error message: undefined/));
    });
})
