import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import InexJSONSelector from '../components/InexJSONSelector';

vi.mock('axios');

describe('InexJSONSelector', () => {
  it('renders InexJSONSelector correctly', async () => {
    render(<InexJSONSelector onChangeHandler={vi.fn()} />);
    await expect(
      screen.getByText(
        'Filter results (e.g. to reduce the size of the results archive)?',
      ),
    ).toBeInTheDocument();
  });

  it('pre-fills an include-only selector without the include/exclude toggle', async () => {
    const onChange = vi.fn();
    render(
      <InexJSONSelector
        idPrefix="input"
        includeOnly={true}
        inexObject={{
          type: 'include',
          files: ['*.gdx'],
          globbing_enabled: false,
        }}
        onChangeHandler={onChange}
      />,
    );

    expect(screen.queryByText(/Include or exclude files/i)).toBeNull();
    expect(screen.getByDisplayValue('*.gdx')).toHaveAttribute(
      'id',
      'inputincludeFiles',
    );
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        JSON.stringify({
          type: 'include',
          files: ['*.gdx'],
          globbing_enabled: false,
        }),
      ),
    );
  });

  it.each([
    ['', null],
    [
      ' a, ,b, ',
      JSON.stringify({
        type: 'include',
        files: ['a', 'b'],
        globbing_enabled: true,
      }),
    ],
  ])('reports %j as %s', async (input, expected) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InexJSONSelector onChangeHandler={onChange} />);

    await user.click(screen.getByLabelText(/Filter results/i));
    if (input) {
      await user.type(screen.getByPlaceholderText(/Files to include/i), input);
    }
    expect(onChange).toHaveBeenLastCalledWith(expected);
  });
});
