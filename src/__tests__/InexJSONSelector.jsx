import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'

import InexJSONSelector from '../components/InexJSONSelector'

vi.mock('axios');

describe('InexJSONSelector', () => {

    it('renders InexJSONSelector correctly', async () => {
        render(<InexJSONSelector onChangeHandler={vi.fn()} />);
        await expect(screen.getByText('Filter results (e.g. to reduce the size of the results archive)?')).toBeInTheDocument()
    });

})
