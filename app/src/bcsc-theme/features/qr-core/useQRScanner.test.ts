import { act, renderHook } from '@testing-library/react-native'

import { QRCodeStrategy, useQRScanner } from './useQRScanner'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@bifold/core', () => {
  class QrCodeScanError extends Error {
    public data?: string
    public details?: string
    public constructor(message?: string, data?: string, details?: string) {
      super(message)
      this.data = data
      this.details = details
    }
  }
  return { QrCodeScanError }
})

const { QrCodeScanError } = jest.requireMock('@bifold/core')

const mkStrategy = (matches: boolean, handle: jest.Mock = jest.fn().mockResolvedValue(undefined)): QRCodeStrategy => ({
  matches: jest.fn(() => matches),
  handle,
})

describe('useQRScanner', () => {
  beforeEach(() => jest.clearAllMocks())

  it('starts idle with no error', () => {
    const { result } = renderHook(() => useQRScanner([]))

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.scanError).toBeNull()
  })

  it('calls handle on the first matching strategy only', async () => {
    const first = mkStrategy(false)
    const second = mkStrategy(true)
    const third = mkStrategy(true)
    const { result } = renderHook(() => useQRScanner([first, second, third]))

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(first.handle).not.toHaveBeenCalled()
    expect(second.handle).toHaveBeenCalledWith('qr')
    expect(third.handle).not.toHaveBeenCalled()
    expect(result.current.scanError).toBeNull()
  })

  it('sets an unrecognized error when no strategy matches', async () => {
    const { result } = renderHook(() => useQRScanner([mkStrategy(false)]))

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(result.current.scanError?.message).toBe('BCSC.Scan.UnrecognizedQR')
    expect(result.current.scanError?.data).toBe('qr')
    expect(result.current.isProcessing).toBe(false)
  })

  it('sets isProcessing while a handler is in flight', async () => {
    let resolve!: () => void
    const handle = jest.fn(() => new Promise<void>((r) => (resolve = r)))
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    let pending!: Promise<void>
    act(() => {
      pending = result.current.handleScan('qr')
    })
    expect(result.current.isProcessing).toBe(true)

    await act(async () => {
      resolve()
      await pending
    })
    expect(result.current.isProcessing).toBe(false)
  })

  it('ignores scans while one is processing', async () => {
    let resolve!: () => void
    const handle = jest.fn(() => new Promise<void>((r) => (resolve = r)))
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    let pending!: Promise<void>
    act(() => {
      pending = result.current.handleScan('qr')
    })
    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(handle).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolve()
      await pending
    })
  })

  it('stays locked after success until resetLock is called', async () => {
    const handle = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    await act(async () => {
      await result.current.handleScan('qr')
    })
    await act(async () => {
      await result.current.handleScan('qr')
    })
    expect(handle).toHaveBeenCalledTimes(1)

    act(() => result.current.resetLock())
    await act(async () => {
      await result.current.handleScan('qr')
    })
    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('preserves a QrCodeScanError thrown by a strategy', async () => {
    const error = new QrCodeScanError('custom', 'qr', 'details')
    const handle = jest.fn().mockRejectedValue(error)
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(result.current.scanError).toBe(error)
  })

  it('wraps other errors as an invalid QR error with the error text as details', async () => {
    const handle = jest.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(result.current.scanError?.message).toBe('BCSC.Scan.InvalidQrCode')
    expect(result.current.scanError?.data).toBe('qr')
    expect(result.current.scanError?.details).toContain('boom')
  })

  it('releases the lock after a failure so the user can scan again', async () => {
    const handle = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    await act(async () => {
      await result.current.handleScan('qr')
    })
    act(() => result.current.dismissError())
    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(handle).toHaveBeenCalledTimes(2)
    expect(result.current.scanError).toBeNull()
  })

  it('ignores scans while an error is showing, and dismissError clears it', async () => {
    const handle = jest.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useQRScanner([mkStrategy(true, handle)]))

    await act(async () => {
      await result.current.handleScan('qr')
    })
    expect(result.current.scanError).not.toBeNull()

    await act(async () => {
      await result.current.handleScan('qr')
    })
    expect(handle).toHaveBeenCalledTimes(1)

    act(() => result.current.dismissError())
    expect(result.current.scanError).toBeNull()
  })
})
