import JSZip from 'jszip';
import {
  zipAsync,
  jobExecutableForRunFile,
  deriveRunFileName,
  stripFileExtension,
  formatFileSize,
} from '../util/util.jsx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

declare global {
  var JSZip: typeof import('jszip');
}

describe('zipAsync', () => {
  const blobSupport = JSZip.support.blob;

  beforeEach(() => {
    globalThis.JSZip = JSZip;
  });

  afterEach(() => {
    globalThis.JSZip.support.blob = blobSupport;
    vi.restoreAllMocks();
  });

  it('should reject if JSZip does not support blobs', async () => {
    globalThis.JSZip.support.blob = false;

    await expect(zipAsync([])).rejects.toThrow(EvalError);
    await expect(zipAsync([])).rejects.toThrow(
      'Your browser does not support zipping files',
    );
  });

  it('should reject if more than 200 files are provided', async () => {
    globalThis.JSZip.support.blob = true;
    const files = Array.from({ length: 201 }, (_, i) => ({
      name: `file${i}.txt`,
      size: 1000,
    }));

    await expect(zipAsync(files)).rejects.toThrow(EvalError);
    await expect(zipAsync(files)).rejects.toThrow(
      'Engine UI does not support uploading more than 200 individual files',
    );
  });

  it('should reject if total file size exceeds 100MB', async () => {
    globalThis.JSZip.support.blob = true;
    const files = [{ name: 'bigfile.txt', size: 100e6 + 1 }];

    await expect(zipAsync(files)).rejects.toThrow(EvalError);
    await expect(zipAsync(files)).rejects.toThrow(
      'Engine UI does not support uploading individual files larger than 100MB',
    );
  });

  it('should successfully zip files when within limits', async () => {
    globalThis.JSZip.support.blob = true;
    const files = [
      new File(['Hello World'], 'file1.txt', { type: 'text/plain' }),
      new File(['Hello World'], 'file2.txt', { type: 'text/plain' }),
    ];
    const zipBlob = await zipAsync(files);

    expect(zipBlob).toBeInstanceOf(Blob);
  });

  it('should call generateAsync with correct options', async () => {
    globalThis.JSZip.support.blob = true;
    const files = [
      new File(['Hello World'], 'test.txt', { type: 'text/plain' }),
    ];

    const spy = vi
      .spyOn(JSZip.prototype, 'generateAsync')
      .mockResolvedValue(new Blob());

    await zipAsync(files);

    expect(spy).toHaveBeenCalledWith({
      type: 'blob',
      platform: 'UNIX',
    });
  });
});

describe('jobExecutableForRunFile', () => {
  it.each([
    ['solve.py', 'python'],
    ['Solve.PY', 'python'],
    ['  solve.py  ', 'python'],
  ])('runs %s with python', (runFileName, expected) => {
    expect(jobExecutableForRunFile(runFileName)).toBe(expected);
  });

  it.each([
    ['trnsport.gms'],
    ['model.zip'],
    ['pyproject.toml'],
    // A name that merely contains ".py" is not a Python entry point.
    ['not.python.gms'],
    [''],
    [undefined],
  ])(
    'leaves %s to Engine’s default executable (gams)',
    (runFileName?: string) => {
      expect(jobExecutableForRunFile(runFileName)).toBe('');
    },
  );
});

describe('deriveRunFileName', () => {
  it('keeps a dropped .py file as the run file rather than renaming it .gms', () => {
    expect(deriveRunFileName(['trnsport.py'])).toBe('trnsport.py');
  });

  it('keeps a dropped .gms file as-is', () => {
    expect(deriveRunFileName(['trnsport.gms'])).toBe('trnsport.gms');
  });

  it('prefers the .gms model when a Python helper script sits next to it', () => {
    expect(deriveRunFileName(['plot.py', 'trnsport.gms'])).toBe('trnsport.gms');
  });

  it('picks the entry point out of a pile of data files, whatever the drop order', () => {
    expect(deriveRunFileName(['data.inc', 'input.csv', 'trnsport.py'])).toBe(
      'trnsport.py',
    );
  });

  it('takes the first candidate when several of the same kind are dropped', () => {
    expect(deriveRunFileName(['a.py', 'b.py'])).toBe('a.py');
  });

  it('falls back to <name>.gms for an archive, whose contents it cannot inspect', () => {
    expect(deriveRunFileName(['trnsport.zip'])).toBe('trnsport.gms');
    expect(deriveRunFileName(['my.model.zip'])).toBe('my.model.gms');
  });

  it('matches an extension regardless of case', () => {
    expect(deriveRunFileName(['Trnsport.PY'])).toBe('Trnsport.PY');
  });
});

describe('stripFileExtension', () => {
  it.each([
    ['trnsport.py', 'trnsport'],
    ['trnsport.gms', 'trnsport'],
    ['trnsport.zip', 'trnsport'],
    // Only the final extension goes - the rest is part of the name.
    ['my.model.gms', 'my.model'],
    // Nothing to strip.
    ['trnsport', 'trnsport'],
    // A leading dot is not an extension separator.
    ['.env', '.env'],
    ['', ''],
  ])('turns %s into the model name %s', (fileName, expected) => {
    expect(stripFileExtension(fileName)).toBe(expected);
  });
});

describe('formatFileSize', () => {
  it.each([
    [1500, {}, '1.50KB'],
    [2.5e6, {}, '2.50MB'],
    [999996, {}, '1.00MB'],
    [1.45 * 1024 ** 3, { binary: true, decimals: 1 }, '1.4GiB'],
    [1023.96 * 1024 ** 2, { binary: true, decimals: 1 }, '1.0GiB'],
    [512 * 1024, { binary: true, decimals: 1 }, '512.0KiB'],
  ])('formats %d with %j as %s', (size, options, expected) => {
    expect(formatFileSize(size, options)).toBe(expected);
  });
});
