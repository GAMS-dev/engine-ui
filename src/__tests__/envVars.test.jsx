import { MAX_ENV_VARS, parseEnvObject, parseEnvText } from '../util/envVars';

describe('parseEnvObject', () => {
  it('parses a JSON object', () => {
    expect(parseEnvObject('{"A":"1","B":"2"}')).toEqual({ A: '1', B: '2' });
  });

  it.each([
    ['an array', '["A","B"]'],
    ['a scalar', '"just a string"'],
    ['malformed JSON', '{not json'],
  ])('returns null for %s', (_label, input) => {
    expect(parseEnvObject(input)).toBeNull();
  });
});

describe('parseEnvText', () => {
  it('parses a JSON object into pairs, so one job’s env pastes into the next', () => {
    expect(parseEnvText('{"MY_VAR_1":"test123","B":"2"}')).toEqual([
      ['MY_VAR_1', 'test123'],
      ['B', '2'],
    ]);
  });

  it('stringifies non-string JSON values rather than dropping them', () => {
    expect(parseEnvText('{"N":5,"B":true,"NUL":null}')).toEqual([
      ['N', '5'],
      ['B', 'true'],
      ['NUL', ''],
    ]);
  });

  it('keeps nested JSON values as JSON', () => {
    expect(parseEnvText('{"O":{"a":1},"L":[1,2]}')).toEqual([
      ['O', '{"a":1}'],
      ['L', '[1,2]'],
    ]);
  });

  it('parses .env-style KEY=VALUE lines', () => {
    expect(parseEnvText('A=1\nB=2')).toEqual([
      ['A', '1'],
      ['B', '2'],
    ]);
  });

  it('ignores blank lines and # comments', () => {
    expect(parseEnvText('# a comment\n\nA=1\n   \n#B=2')).toEqual([['A', '1']]);
  });

  it('strips an `export ` prefix and matching surrounding quotes', () => {
    expect(parseEnvText('export A="hello world"\nB=\'x\'')).toEqual([
      ['A', 'hello world'],
      ['B', 'x'],
    ]);
  });

  it('keeps everything after the first = as the value', () => {
    expect(parseEnvText('CONN=key=value;other=thing')).toEqual([
      ['CONN', 'key=value;other=thing'],
    ]);
  });

  it('allows an empty value', () => {
    expect(parseEnvText('EMPTY=')).toEqual([['EMPTY', '']]);
  });

  it('skips a line with no name before the =', () => {
    expect(parseEnvText('=novalue\nA=1')).toEqual([['A', '1']]);
  });

  it.each([
    ['plain text with no separator', 'JUST_A_NAME'],
    ['empty input', '   '],
    ['nullish input', null],
  ])('returns null for %s, so it pastes normally', (_label, input) => {
    expect(parseEnvText(input)).toBeNull();
  });

  it('falls back to KEY=VALUE parsing for something that starts with { but is not JSON', () => {
    expect(parseEnvText('{BROKEN=1')).toEqual([['{BROKEN', '1']]);
  });
});

describe('MAX_ENV_VARS', () => {
  it('matches the limit Engine enforces', () => {
    expect(MAX_ENV_VARS).toBe(20);
  });
});
