import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DownloadLink from '../components/DownloadLink'
import axios from 'axios';

jest.mock('axios');

describe('DownloadLink', () => {

    beforeEach(() => {
        axios.get.mockResolvedValue({
            status: 200,
            data: "someData",
        })

        // Mock the CancelToken source and axios get method
        const cancel = jest.fn();
        axios.isCancel = jest.fn();

        // You can also mock CancelToken source if needed
        axios.CancelToken.source = jest.fn(() => ({
            token: { cancel },
            cancel,
        }));
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

    it('renders DownloadLink correctly', async () => {
        render(<DownloadLink url="download/url" />);
        expect(screen.getByRole('button')).toBeInTheDocument()
    });

})
