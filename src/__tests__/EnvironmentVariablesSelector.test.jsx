import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import EnvironmentVariablesSelector from '../components/EnvironmentVariablesSelector';
import { MAX_ENV_VARS } from '../util/envVars';

// What callers actually consume: the latest onChange args.
const lastEmit = (onChange) => {
  const calls = onChange.mock.calls;
  return calls.length ? calls[calls.length - 1] : [];
};

const nameField = (idx) =>
  screen.getByLabelText(`Environment variable ${idx} name`);
const valueField = (idx) =>
  screen.getByLabelText(`Environment variable ${idx} value`);

describe('EnvironmentVariablesSelector', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('starts empty, emitting no env and a submittable state', () => {
    const onChange = vi.fn();
    render(<EnvironmentVariablesSelector onChange={onChange} />);

    expect(
      screen.getByRole('button', { name: /Add environment variable/i }),
    ).toBeInTheDocument();
    expect(lastEmit(onChange)).toEqual(['', true]);
  });

  it('emits the JSON object Engine expects as variables are typed', async () => {
    const onChange = vi.fn();
    render(<EnvironmentVariablesSelector onChange={onChange} />);

    await user.click(
      screen.getByRole('button', { name: /Add environment variable/i }),
    );
    await user.type(nameField(1), 'MY_VAR_1');
    await user.type(valueField(1), 'test123');

    await waitFor(() =>
      expect(lastEmit(onChange)).toEqual(['{"MY_VAR_1":"test123"}', true]),
    );
  });

  it('seeds its rows from an existing model’s env object', () => {
    const onChange = vi.fn();
    render(
      <EnvironmentVariablesSelector
        initialEnv={{ FOO: 'bar' }}
        onChange={onChange}
      />,
    );

    expect(nameField(1)).toHaveValue('FOO');
    expect(valueField(1)).toHaveValue('bar');
    expect(lastEmit(onChange)).toEqual(['{"FOO":"bar"}', true]);
  });

  it('seeds nested values as JSON', () => {
    render(
      <EnvironmentVariablesSelector
        initialEnv={{ OPTS: { threads: 4 }, LIST: ['a', 'b'] }}
        onChange={vi.fn()}
      />,
    );

    expect(valueField(1)).toHaveValue('{"threads":4}');
    expect(valueField(2)).toHaveValue('["a","b"]');
  });

  it('seeds from a JSON string just as well as from an object', () => {
    const onChange = vi.fn();
    render(
      <EnvironmentVariablesSelector
        initialEnv='{"FOO":"bar"}'
        onChange={onChange}
      />,
    );

    expect(nameField(1)).toHaveValue('FOO');
    expect(valueField(1)).toHaveValue('bar');
  });

  it('seeds once the model data arrives late, as on the update form', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EnvironmentVariablesSelector initialEnv={null} onChange={onChange} />,
    );
    expect(
      screen.getByRole('button', { name: /Add environment variable/i }),
    ).toBeInTheDocument();

    rerender(
      <EnvironmentVariablesSelector
        initialEnv={{ LATE: 'arrival' }}
        onChange={onChange}
      />,
    );

    await waitFor(() => expect(nameField(1)).toHaveValue('LATE'));
  });

  it('removes a variable', async () => {
    const onChange = vi.fn();
    render(
      <EnvironmentVariablesSelector
        initialEnv={{ A: '1', B: '2' }}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /Remove environment variable 1/i }),
    );

    await waitFor(() =>
      expect(lastEmit(onChange)).toEqual(['{"B":"2"}', true]),
    );
  });

  describe('validation', () => {
    it('reports a name-less variable as unsubmittable rather than dropping it silently', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      await user.type(valueField(1), 'orphaned');

      await waitFor(() =>
        expect(
          screen.getByText(/Give this variable a name/i),
        ).toBeInTheDocument(),
      );
      expect(lastEmit(onChange)).toEqual(['', false]);
    });

    it('rejects a name containing a space or =', async () => {
      const onChange = vi.fn();
      render(
        <EnvironmentVariablesSelector
          initialEnv={{ GOOD: '1' }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Add variable/i }));
      await user.type(nameField(2), 'BAD NAME');

      await waitFor(() =>
        expect(
          screen.getByText(/cannot contain spaces or "="/i),
        ).toBeInTheDocument(),
      );
      // Valid rows still emitted, but not submittable.
      expect(lastEmit(onChange)).toEqual(['{"GOOD":"1"}', false]);
    });

    it('flags a duplicate name', async () => {
      const onChange = vi.fn();
      render(
        <EnvironmentVariablesSelector
          initialEnv={{ DUP: '1' }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Add variable/i }));
      await user.type(nameField(2), 'DUP');

      await waitFor(() =>
        expect(screen.getByText(/is already set above/i)).toBeInTheDocument(),
      );
      expect(lastEmit(onChange)[1]).toBe(false);
    });

    it('treats a wholly empty row as neither counted nor invalid', async () => {
      const onChange = vi.fn();
      render(
        <EnvironmentVariablesSelector
          initialEnv={{ A: '1' }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Add variable/i }));

      await waitFor(() =>
        expect(lastEmit(onChange)).toEqual(['{"A":"1"}', true]),
      );
      expect(screen.getByText('1 / 20')).toBeInTheDocument();
    });
  });

  describe(`the ${MAX_ENV_VARS}-variable limit`, () => {
    const fullEnv = Object.fromEntries(
      Array.from({ length: MAX_ENV_VARS }, (_, i) => [`VAR_${i}`, String(i)]),
    );

    it('shows the count and stops offering more rows once full', () => {
      render(
        <EnvironmentVariablesSelector
          initialEnv={fullEnv}
          onChange={vi.fn()}
        />,
      );

      expect(
        screen.getByText(`${MAX_ENV_VARS} / ${MAX_ENV_VARS}`),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Add variable/i }),
      ).toBeDisabled();
    });

    it('keeps only what fits when more than the limit is pasted', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      const pasted = Array.from(
        { length: MAX_ENV_VARS + 3 },
        (_, i) => `P_${i}=${i}`,
      ).join('\n');
      const target = screen.getByRole('button', {
        name: /Add environment variable/i,
      });
      target.focus();
      await user.paste(pasted);

      await waitFor(() =>
        expect(screen.getByText(/3 more didn't fit/i)).toBeInTheDocument(),
      );
      const [json, isValid] = lastEmit(onChange);
      expect(Object.keys(JSON.parse(json))).toHaveLength(MAX_ENV_VARS);
      expect(isValid).toBe(true);
    });
  });

  describe('paste', () => {
    it('expands pasted KEY=VALUE lines into rows', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      nameField(1).focus();
      await user.paste('A=1\nB=2');

      await waitFor(() =>
        expect(lastEmit(onChange)).toEqual(['{"A":"1","B":"2"}', true]),
      );
    });

    it('expands a pasted JSON object into rows', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      nameField(1).focus();
      await user.paste('{"MY_VAR_1":"test123"}');

      await waitFor(() =>
        expect(lastEmit(onChange)).toEqual(['{"MY_VAR_1":"test123"}', true]),
      );
    });

    it('updates an existing variable instead of creating a duplicate of it', async () => {
      const onChange = vi.fn();
      render(
        <EnvironmentVariablesSelector
          initialEnv={{ KEEP: 'old', OTHER: 'x' }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Add variable/i }));
      nameField(3).focus();
      await user.paste('KEEP=new');

      await waitFor(() =>
        expect(lastEmit(onChange)).toEqual([
          '{"KEEP":"new","OTHER":"x"}',
          true,
        ]),
      );
    });

    it('keeps the last value of a name the paste repeats', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      nameField(1).focus();
      await user.paste('FOO=1\nBAR=x\nFOO=2');

      await waitFor(() =>
        expect(lastEmit(onChange)).toEqual(['{"FOO":"2","BAR":"x"}', true]),
      );
      expect(screen.queryByLabelText('Environment variable 3 name')).toBeNull();
    });

    it('keeps nested JSON values as JSON rather than mangling them', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      nameField(1).focus();
      await user.paste(
        '{ "GAMS_OPTS": {"threads": 4}, "SCENARIOS": ["base", "high"] }',
      );

      await waitFor(() => expect(valueField(1)).toHaveValue('{"threads":4}'));
      expect(valueField(2)).toHaveValue('["base","high"]');
      expect(lastEmit(onChange)[1]).toBe(true);
    });

    it('pastes an ordinary name normally, without trying to split it', async () => {
      const onChange = vi.fn();
      render(<EnvironmentVariablesSelector onChange={onChange} />);

      await user.click(
        screen.getByRole('button', { name: /Add environment variable/i }),
      );
      nameField(1).focus();
      await user.paste('PLAIN_NAME');

      expect(nameField(1)).toHaveValue('PLAIN_NAME');
    });
  });

  it('adds a row on Enter rather than submitting the surrounding form', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <EnvironmentVariablesSelector
          initialEnv={{ A: '1' }}
          onChange={vi.fn()}
        />
      </form>,
    );

    nameField(1).focus();
    await user.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Environment variable 2 name'),
      ).toBeInTheDocument(),
    );
  });

  it('disables every control while its form is submitting', () => {
    render(
      <EnvironmentVariablesSelector
        initialEnv={{ A: '1' }}
        disabled
        onChange={vi.fn()}
      />,
    );

    expect(nameField(1)).toBeDisabled();
    expect(valueField(1)).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Add variable/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Remove environment variable 1/i }),
    ).toBeDisabled();
  });
});
