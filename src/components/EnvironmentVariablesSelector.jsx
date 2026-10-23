import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Info, Plus, X } from 'lucide-react';
import {
  MAX_ENV_VARS,
  INVALID_ENV_KEY_CHARS,
  envValueToString,
  parseEnvText,
  parseEnvObject,
} from '../util/envVars';

let nextRowId = 0;
const makeRow = (key = '', value = '') => {
  nextRowId += 1;
  return { id: nextRowId, key, value };
};

// A wholly empty row is an open input, not an incomplete variable: it is
// neither counted against MAX_ENV_VARS nor flagged.
const isBlankRow = (row) => row.key.trim() === '' && row.value === '';

const validateRows = (rows) => {
  const errors = new Map();
  const seen = new Set();
  rows.forEach((row) => {
    if (isBlankRow(row)) {
      return;
    }
    const key = row.key.trim();
    if (key === '') {
      errors.set(row.id, 'Give this variable a name, or remove the row.');
      return;
    }
    if (INVALID_ENV_KEY_CHARS.test(key)) {
      errors.set(row.id, 'A name cannot contain spaces or "=".');
      return;
    }
    if (seen.has(key)) {
      errors.set(row.id, `"${key}" is already set above.`);
      return;
    }
    seen.add(key);
  });
  return errors;
};

// `initialEnv` is either Engine's object or the JSON string we emit.
const rowsFromEnv = (env) => {
  if (!env) {
    return [];
  }
  const source = typeof env === 'string' ? parseEnvObject(env) : env;
  if (!source) {
    return [];
  }
  return Object.entries(source).map(([key, value]) =>
    makeRow(key, envValueToString(value)),
  );
};

// Editor for the `env` JSON object sent with a job or model. `onChange`
// gets the JSON to submit ('' when empty) plus whether it's submittable -
// block submission while that's false, since an invalid row is left out of
// the JSON rather than mangled into it.
const EnvironmentVariablesSelector = ({
  initialEnv,
  onChange,
  disabled = false,
  idPrefix = 'env',
  label = 'Environment variables',
}) => {
  const [rows, setRows] = useState(() => rowsFromEnv(initialEnv));
  const [noticeMsg, setNoticeMsg] = useState('');
  // Focuses the name field of a newly added row.
  const rowToFocusRef = useRef(null);
  const keyInputsRef = useRef(new Map());

  // On the update form the model is fetched after the first render, so seed
  // once `initialEnv` turns into something real.
  const seededRef = useRef(initialEnv != null);
  useEffect(() => {
    if (seededRef.current || initialEnv == null) {
      return;
    }
    seededRef.current = true;
    const seeded = rowsFromEnv(initialEnv);
    if (seeded.length > 0) {
      setRows(seeded);
    }
  }, [initialEnv]);

  const errors = useMemo(() => validateRows(rows), [rows]);
  const activeRows = useMemo(() => rows.filter((r) => !isBlankRow(r)), [rows]);
  const overLimit = activeRows.length > MAX_ENV_VARS;

  useEffect(() => {
    const entries = rows
      .filter((row) => !isBlankRow(row) && !errors.has(row.id))
      .map((row) => [row.key.trim(), row.value]);
    onChange(
      entries.length > 0 ? JSON.stringify(Object.fromEntries(entries)) : '',
      errors.size === 0 && !overLimit,
    );
  }, [rows, errors, overLimit, onChange]);

  useEffect(() => {
    if (rowToFocusRef.current == null) {
      return;
    }
    keyInputsRef.current.get(rowToFocusRef.current)?.focus();
    rowToFocusRef.current = null;
  });

  const updateRow = useCallback((id, patch) => {
    setNoticeMsg('');
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }, []);

  const addRow = useCallback(() => {
    setNoticeMsg('');
    const row = makeRow();
    rowToFocusRef.current = row.id;
    setRows((prev) => [...prev, row]);
  }, []);

  const removeRow = useCallback((id) => {
    setNoticeMsg('');
    keyInputsRef.current.delete(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // A name already present (in a row or earlier in this paste) is updated in
  // place; the rest replace the row pasted into, or append if `targetId` is null.
  const applyPastedPairs = (targetId, pairs) => {
    const copies = rows.map((row) => ({ ...row }));
    const targetIdx =
      targetId == null ? -1 : copies.findIndex((row) => row.id === targetId);
    const before = targetIdx === -1 ? copies : copies.slice(0, targetIdx);
    const after = targetIdx === -1 ? [] : copies.slice(targetIdx + 1);
    const kept = [...before, ...after];

    const pasted = [];
    let dropped = 0;
    pairs.forEach(([key, value]) => {
      const existing = [...kept, ...pasted].find(
        (row) => row.key.trim() === key,
      );
      if (existing) {
        existing.value = value;
        return;
      }
      const wouldCount =
        kept.filter((row) => !isBlankRow(row)).length + pasted.length;
      if (wouldCount >= MAX_ENV_VARS) {
        dropped += 1;
        return;
      }
      pasted.push(makeRow(key, value));
    });

    setRows([...before, ...pasted, ...after]);
    setNoticeMsg(
      dropped > 0
        ? `Only the first ${MAX_ENV_VARS} variables were kept - ${dropped} more didn't fit.`
        : '',
    );
  };

  const handlePaste = (event, rowId) => {
    const pairs = parseEnvText(event.clipboardData.getData('text'));
    if (!pairs) {
      return;
    }
    event.preventDefault();
    applyPastedPairs(rowId, pairs);
  };

  // Enter would otherwise submit the surrounding form; here it means
  // "give me another variable".
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeRows.length < MAX_ENV_VARS) {
        addRow();
      }
    }
  };

  const atLimit = activeRows.length >= MAX_ENV_VARS;

  return (
    <div className="env-vars">
      <div className="env-vars-header">
        <span className="env-vars-label">
          {label}
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`${idPrefix}-tooltip`}>
                <div>
                  Passed to the process running your model. Names and values are
                  both sent as strings, up to {MAX_ENV_VARS} variables.
                  <br />
                  Paste <code>KEY=VALUE</code> lines or a JSON object into a
                  name field to fill several at once.
                </div>
              </Tooltip>
            }
          >
            <Info size={16} className="info-tooltip-icon" />
          </OverlayTrigger>
        </span>
        {activeRows.length > 0 && (
          <span
            className={`env-vars-count${overLimit ? ' env-vars-count-over' : ''}`}
          >
            {activeRows.length} / {MAX_ENV_VARS}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <button
          type="button"
          className="env-vars-empty"
          onClick={addRow}
          disabled={disabled}
          onPaste={(event) => handlePaste(event, null)}
        >
          <Plus size={16} className="me-2" />
          Add environment variable
          <span className="env-vars-empty-hint">
            or paste KEY=VALUE lines / JSON
          </span>
        </button>
      ) : (
        <>
          <div className="env-vars-rows">
            {rows.map((row, idx) => {
              const error = errors.get(row.id);
              const inputId = `${idPrefix}Name${idx}`;
              return (
                <div className="env-vars-row" key={row.id}>
                  <div className="env-vars-pair">
                    <input
                      type="text"
                      className={`form-control font-monospace${error ? ' is-invalid' : ''}`}
                      id={inputId}
                      ref={(el) => {
                        if (el) {
                          keyInputsRef.current.set(row.id, el);
                        } else {
                          keyInputsRef.current.delete(row.id);
                        }
                      }}
                      placeholder="MY_VARIABLE"
                      aria-label={`Environment variable ${idx + 1} name`}
                      autoComplete="off"
                      spellCheck="false"
                      disabled={disabled}
                      value={row.key}
                      onPaste={(event) => handlePaste(event, row.id)}
                      onKeyDown={handleKeyDown}
                      onChange={(event) =>
                        updateRow(row.id, { key: event.target.value })
                      }
                    />
                    <span className="env-vars-equals" aria-hidden="true">
                      =
                    </span>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="value"
                      aria-label={`Environment variable ${idx + 1} value`}
                      autoComplete="off"
                      spellCheck="false"
                      disabled={disabled}
                      value={row.value}
                      onKeyDown={handleKeyDown}
                      onChange={(event) =>
                        updateRow(row.id, { value: event.target.value })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="env-vars-remove"
                    onClick={() => removeRow(row.id)}
                    disabled={disabled}
                    aria-label={`Remove environment variable ${idx + 1}`}
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                  {error && <div className="env-vars-error">{error}</div>}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="env-vars-add"
            onClick={addRow}
            disabled={disabled || atLimit}
            title={
              atLimit
                ? `A job can carry at most ${MAX_ENV_VARS} environment variables`
                : undefined
            }
          >
            <Plus size={16} className="me-1" />
            Add variable
          </button>
        </>
      )}
      {(noticeMsg !== '' || overLimit) && (
        <div
          className={`env-vars-notice${overLimit ? ' env-vars-notice-error' : ''}`}
        >
          {overLimit
            ? `Remove ${activeRows.length - MAX_ENV_VARS} variable(s) - at most ${MAX_ENV_VARS} can be sent.`
            : noticeMsg}
        </div>
      )}
    </div>
  );
};

export default EnvironmentVariablesSelector;
