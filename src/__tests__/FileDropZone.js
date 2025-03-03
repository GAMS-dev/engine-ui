import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import FileDropZone from '../components/FileDropZone'

jest.mock('axios');

describe('FileDropZone', () => {

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

    it('renders FileDropZone correctly', async () => {
        render(<FileDropZone />);
        expect(screen.getByRole('complementary', { class: "dropzone-file-info" })).toBeInTheDocument()
    });

})
