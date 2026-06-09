import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import NetInfo from '@react-native-community/netinfo'

import {
  buildUploadFailureDiagnostics,
  getNetworkStateSnapshot,
  tagUploadFailure,
  UploadFileContext,
} from './network-diagnostics'

describe('network-diagnostics', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('tagUploadFailure', () => {
    it('passes a resolved value through unchanged', async () => {
      await expect(tagUploadFailure(Promise.resolve('ok'), { kind: 'photo', sizeBytes: 1 })).resolves.toBe('ok')
    })

    it('attaches non-enumerable __uploadCtx to a rejected error and re-throws the same error', async () => {
      const ctx: UploadFileContext = { kind: 'video', host: 'store.example.com', sizeBytes: 42 }
      const original = new Error('socket hang up')

      await expect(tagUploadFailure(Promise.reject(original), ctx)).rejects.toBe(original)
      expect((original as unknown as { __uploadCtx: UploadFileContext }).__uploadCtx).toEqual(ctx)
      // Non-enumerable so it never leaks into JSON.stringify / Object.keys serialization.
      expect(Object.keys(original)).not.toContain('__uploadCtx')
    })
  })

  describe('getNetworkStateSnapshot', () => {
    it('maps NetInfo state to a redacted snapshot', async () => {
      jest.mocked(NetInfo.refresh).mockResolvedValueOnce({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: false,
      } as any)

      await expect(getNetworkStateSnapshot()).resolves.toEqual({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      })
    })

    it('returns null when NetInfo cannot be read', async () => {
      jest.mocked(NetInfo.refresh).mockRejectedValueOnce(new Error('native module unavailable'))

      await expect(getNetworkStateSnapshot()).resolves.toBeNull()
    })
  })

  describe('buildUploadFailureDiagnostics', () => {
    it('assembles stage, tagged file, network snapshot, elapsed time, and axios detail', async () => {
      jest.mocked(NetInfo.refresh).mockResolvedValueOnce({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
      } as any)

      const axiosError = {
        code: 'ERR_NETWORK',
        config: { method: 'put', url: 'https://store.example.com/v.mp4?sig=SECRET' },
      }
      const appError = AppError.fromErrorDefinition(ErrorRegistry.NO_INTERNET, { cause: axiosError, track: false })
      Object.defineProperty(appError, '__uploadCtx', {
        value: { kind: 'video', host: 'store.example.com', sizeBytes: 100 },
        enumerable: false,
      })

      const diagnostics = await buildUploadFailureDiagnostics(appError, { stage: 'upload-binaries', startedAt: 0 })

      expect(diagnostics).toMatchObject({
        stage: 'upload-binaries',
        file: { kind: 'video', host: 'store.example.com', sizeBytes: 100 },
        network: { isConnected: true, isInternetReachable: true, type: 'cellular' },
        axios: { axiosCode: 'ERR_NETWORK', method: 'PUT', host: 'store.example.com' },
      })
      expect(typeof diagnostics.elapsedMs).toBe('number')
      // Redaction guarantee: the signed-URL token must never reach remote logs.
      expect(JSON.stringify(diagnostics)).not.toContain('SECRET')
    })

    it('omits file and elapsed when the error is untagged and no start time is given', async () => {
      const diagnostics = await buildUploadFailureDiagnostics(new Error('boom'), { stage: 'finalize' })

      expect(diagnostics.file).toBeUndefined()
      expect(diagnostics.elapsedMs).toBeUndefined()
      expect(diagnostics.stage).toBe('finalize')
      expect(diagnostics.axios).toEqual({})
    })
  })
})
