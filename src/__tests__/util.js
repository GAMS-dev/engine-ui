import JSZip from 'jszip'
import { zipAsync } from '../components/util.js'

describe('zipAsync', () => {
    beforeEach(() => {
        global.JSZip = JSZip
    })

    test('should reject if JSZip does not support blobs', async () => {
        global.JSZip.support = { blob: false }

        await expect(zipAsync([])).rejects.toThrow(EvalError)
        await expect(zipAsync([])).rejects.toThrow(
            'Your browser does not support zipping files'
        )
    })

    test('should reject if more than 200 files are provided', async () => {
        global.JSZip.support = { blob: true }
        const files = Array.from({ length: 201 }, (_, i) => ({
            name: `file${i}.txt`,
            size: 1000,
        }))

        await expect(zipAsync(files)).rejects.toThrow(EvalError)
        await expect(zipAsync(files)).rejects.toThrow(
            'Engine UI does not support uploading more than 200 individual files'
        )
    })

    test('should reject if total file size exceeds 100MB', async () => {
        global.JSZip.support = { blob: true }
        const files = [{ name: 'bigfile.txt', size: 100e6 + 1 }]

        await expect(zipAsync(files)).rejects.toThrow(EvalError)
        await expect(zipAsync(files)).rejects.toThrow(
            'Engine UI does not support uploading individual files larger than 100MB'
        )
    })

    test('should successfully zip files when within limits', async () => {
        global.JSZip.support = { blob: true }
        const files = [
            new File(['Hello World'], 'file1.txt', { type: 'text/plain' }),
            new File(['Hello World'], 'file2.txt', { type: 'text/plain' }),
        ]

        const zipBlob = await zipAsync(files)
        expect(zipBlob).toBeInstanceOf(Blob)
    })

    test('should call generateAsync with correct options', async () => {
        global.JSZip.support = { blob: true }
        const files = [
            new File(['Hello World'], 'test.txt', { type: 'text/plain' }),
        ]
        const mockGenerateAsync = jest.fn().mockResolvedValue(new Blob())

        JSZip.prototype.generateAsync = mockGenerateAsync

        await zipAsync(files)

        expect(mockGenerateAsync).toHaveBeenCalledWith(
            { type: 'blob', platform: 'UNIX' },
            expect.any(Function)
        )
    })
})
