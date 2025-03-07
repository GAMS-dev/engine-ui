import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { suppressActWarnings } from './utils/testUtils';

import FileDropZone from '../components/FileDropZone'

jest.mock('axios');

describe('FileDropZone', () => {
    suppressActWarnings()

    it('renders FileDropZone correctly', async () => {
        render(<FileDropZone />);
        expect(screen.getByRole('complementary', { class: "dropzone-file-info" })).toBeInTheDocument()
    });

})
