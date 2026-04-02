import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import FileDropZone from '../components/FileDropZone';

vi.mock('axios');

describe('FileDropZone', () => {
  it('renders FileDropZone correctly', async () => {
    render(<FileDropZone />);
    await expect(
      screen.getByRole('complementary', { class: 'dropzone-file-info' }),
    ).toBeInTheDocument();
  });
});
