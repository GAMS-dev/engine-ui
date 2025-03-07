import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'

import InexJSONSelector from '../components/InexJSONSelector'

jest.mock('axios');

describe('InexJSONSelector', () => {
    suppressActWarnings()

    it('renders InexJSONSelector correctly', async () => {
        render(<InexJSONSelector onChangeHandler={jest.fn()} />);
        expect(screen.getByText('Filter results (e.g. to reduce the size of the results archive)?')).toBeInTheDocument()
    });

})
