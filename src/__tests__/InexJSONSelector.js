import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'

import InexJSONSelector from '../components/InexJSONSelector'

jest.mock('axios');

describe('InexJSONSelector', () => {

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

    it('renders InexJSONSelector correctly', async () => {
        render(<InexJSONSelector onChangeHandler={jest.fn()} />);
        expect(screen.getByText('Filter results (e.g. to reduce the size of the results archive)?')).toBeInTheDocument()
    });

})
