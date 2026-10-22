import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { AppError } from '@/errors'
import { useServices } from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'

import { QRCodeStrategy, useQRScanner } from './useQRScanner'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@/contexts/ErrorAlertContext', () => ({ useErrorAlert: jest.fn() }))
jest.mock('@bifold/core', () => ({
  TOKENS: { UTIL_LOGGER: 'UTIL_LOGGER' },
  useServices: jest.fn(),
}))

const mkStrategy = (
  matches: boolean,
  handle: jest.Mock = jest.fn().mockResolvedValue(undefined),
  toErrorModal: QRCodeStrategy['toErrorModal'] = jest.fn().mockReturnValue(null)
): QRCodeStrategy => ({
  matches: jest.fn(() => matches),
  handle,
  toErrorModal,
})

const mockLogger = { warn: jest.fn() }

const renderScanner = (strategies: QRCodeStrategy[], { isErrorModalVisible = false } = {}) => {
  const emitErrorModal = jest.fn()
  jest.mocked(useServices).mockReturnValue([mockLogger] as unknown as ReturnType<typeof useServices>)
  jest
    .mocked(useErrorAlert)
    .mockReturnValue({ emitErrorModal, isErrorModalVisible } as unknown as ReturnType<typeof useErrorAlert>)

  return { emitErrorModal, ...renderHook(() => useQRScanner(strategies)) }
}

describe('useQRScanner', () => {
  beforeEach(() => jest.clearAllMocks())

  it('starts idle', () => {
    const { result } = renderScanner([])

    expect(result.current.isProcessing).toBe(false)
  })

  it('calls handle on the first matching strategy only', async () => {
    const first = mkStrategy(false)
    const second = mkStrategy(true)
    const third = mkStrategy(true)
    const { result, emitErrorModal } = renderScanner([first, second, third])

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(first.handle).not.toHaveBeenCalled()
    expect(second.handle).toHaveBeenCalledWith('qr')
    expect(third.handle).not.toHaveBeenCalled()
    expect(emitErrorModal).not.toHaveBeenCalled()
  })

  it('emits an unrecognized QR modal when no strategy matches', async () => {
    const { result, emitErrorModal } = renderScanner([mkStrategy(false)])

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(emitErrorModal).toHaveBeenCalledWith(
      'BCSC.Scan.UnrecognizedQR',
      'BCSC.Scan.UnrecognizedQRDescription',
      expect.any(AppError)
    )
    expect(result.current.isProcessing).toBe(false)
  })

  it('logs a safe description of the QR code when no strategy matches, never the value', async () => {
    const { result } = renderScanner([mkStrategy(false)])

    await act(async () => {
      await result.current.handleScan('https://example.com/path?token=secret')
    })

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No strategy matched'),
      expect.objectContaining({ qrScheme: 'https', qrHasQuery: true })
    )
    expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain('secret')
  })

  it('does not lock scanning when no strategy matches', async () => {
    const handle = jest.fn().mockResolvedValue(undefined)
    const unmatched = mkStrategy(false, handle)
    const { result } = renderScanner([unmatched])

    await act(async () => {
      await result.current.handleScan('qr')
    })
    jest.mocked(unmatched.matches).mockReturnValue(true)
    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(handle).toHaveBeenCalledTimes(1)
  })

  it('sets isProcessing while a handler is in flight', async () => {
    let resolve!: () => void
    const handle = jest.fn(() => new Promise<void>((r) => (resolve = r)))
    const { result } = renderScanner([mkStrategy(true, handle)])

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
    const { result } = renderScanner([mkStrategy(true, handle)])

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
    const { result } = renderScanner([mkStrategy(true, handle)])

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

  it('emits the strategy error modal when the strategy throws', async () => {
    const thrown = new Error('boom')
    const appError = { message: 'wrapped' } as AppError
    const toErrorModal = jest.fn().mockReturnValue({ error: appError, title: 'Title', description: 'Description' })
    const handle = jest.fn().mockRejectedValue(thrown)
    const { result, emitErrorModal } = renderScanner([mkStrategy(true, handle, toErrorModal)])

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(toErrorModal).toHaveBeenCalledWith(thrown)
    expect(emitErrorModal).toHaveBeenCalledWith('Title', 'Description', appError)
  })

  it('shows nothing when the strategy reports the error as already handled', async () => {
    const handle = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
    const { result, emitErrorModal } = renderScanner([mkStrategy(true, handle, jest.fn().mockReturnValue(null))])

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(emitErrorModal).not.toHaveBeenCalled()
  })

  it('releases the lock after a failure so the user can scan again', async () => {
    const handle = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
    const { result } = renderScanner([mkStrategy(true, handle)])

    await act(async () => {
      await result.current.handleScan('qr')
    })
    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(handle).toHaveBeenCalledTimes(2)
  })

  it('ignores scans while an error modal is visible', async () => {
    const handle = jest.fn().mockResolvedValue(undefined)
    const { result } = renderScanner([mkStrategy(true, handle)], { isErrorModalVisible: true })

    await act(async () => {
      await result.current.handleScan('qr')
    })

    expect(handle).not.toHaveBeenCalled()
  })
})
