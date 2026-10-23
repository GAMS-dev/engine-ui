// Parsing/limits for the `env` object sent with a job or model.
export const MAX_ENV_VARS = 20;

export const INVALID_ENV_KEY_CHARS = /[\s=]/;

// A JSON object (not an array or scalar), or null.
export const parseEnvObject = (text) => {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

// Engine only takes strings; nested values keep their JSON form.
export const envValueToString = (value) => {
  if (value == null) {
    return '';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

// Pasted text as `[key, value]` pairs, or null when it's an ordinary value
// that should paste normally. Takes a JSON object (so one job's env pastes
// into the next) or `.env` lines, incl. `export `, `#` comments and quotes.
export const parseEnvText = (text) => {
  const trimmed = (text ?? '').trim();
  if (trimmed === '') {
    return null;
  }
  if (trimmed.startsWith('{')) {
    const parsed = parseEnvObject(trimmed);
    if (parsed) {
      return Object.entries(parsed).map(([key, value]) => [
        key,
        envValueToString(value),
      ]);
    }
    // Not JSON after all - read it as KEY=VALUE lines instead.
  }
  const pairs = [];
  trimmed.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim().replace(/^export\s+/, '');
    if (line === '' || line.startsWith('#')) {
      return;
    }
    const separator = line.indexOf('=');
    // `< 1` rather than `< 0`: a line starting with `=` has no name at all.
    if (separator < 1) {
      return;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if (
      value.length >= 2 &&
      (quote === '"' || quote === "'") &&
      value.endsWith(quote)
    ) {
      value = value.slice(1, -1);
    }
    pairs.push([key, value]);
  });
  return pairs.length > 0 ? pairs : null;
};
