import JSZip from 'jszip';
import { zipAsync } from '../util/util.jsx';
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
