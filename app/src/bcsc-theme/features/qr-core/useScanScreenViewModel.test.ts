import { act, renderHook, waitFor } from '@testing-library/react-native'

import type { UriStrategy } from './uri-strategies/types'
import useScanScreenViewModel from './useScanScreenViewModel'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('react-native-vision-camera', () => ({
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn().mockResolvedValue(true) }),
}))
jest.mock('@bifold/react-hooks', () => ({ useAgent: () => ({ agent: { id: 'agent' } }) }))
jest.mock('@bifold/core', () => {
  class QrCodeScanError extends Error {
    title: string
    data?: string
    constructor(title: string, data?: string, message?: string) {
      super(message ?? title)
      this.title = title
      this.data = data
    }
  }
  return {
    QrCodeScanError,
    TOKENS: { UTIL_LOGGER: 'logger' },
    useServices: () => [{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }],
  }
})

const mkStrategy = (
  matches: boolean,
  result: Awaited<ReturnType<UriStrategy['handle']>> | Error,
  name = 'mock'
): UriStrategy => ({
  name,
  matches: () => matches,
  handle: jest.fn(async () => {
    if (result instanceof Error) {
      throw result
    }
    return result
  }),
})

describe('useScanScreenViewModel', () => {
  beforeEach(() => jest.clearAllMocks())

  it('invokes onConnectionFound with the oobRecordId on connection result', async () => {
    const onConnectionFound = jest.fn()
    const strat = mkStrategy(true, { kind: 'connection', oobRecordId: 'rec-1' })
    const { result } = renderHook(() => useScanScreenViewModel({ onConnectionFound, strategies: [strat] }))
    await act(async () => {
      await result.current.handleScan('didcomm://x')
    })
    expect(onConnectionFound).toHaveBeenCalledWith('rec-1')
    expect(result.current.scanError).toBeNull()
  })

  it('sets scanError with localized key when result is unsupported', async () => {
    const onConnectionFound = jest.fn()
    const strat = mkStrategy(true, { kind: 'unsupported', reason: 'OpenID' })
    const { result } = renderHook(() => useScanScreenViewModel({ onConnectionFound, strategies: [strat] }))
    await act(async () => {
      await result.current.handleScan('openid://x')
    })
    await waitFor(() => expect(result.current.scanError).not.toBeNull())
    expect(result.current.scanError?.message).toBe('BCSC.Scan.Unsupported.OpenID')
  })

  it('sets scanError when no strategy matches', async () => {
    const onConnectionFound = jest.fn()
    const strat = mkStrategy(false, { kind: 'connection', oobRecordId: 'x' })
    const { result } = renderHook(() => useScanScreenViewModel({ onConnectionFound, strategies: [strat] }))
    await act(async () => {
      await result.current.handleScan('https://random.example.com')
    })
    expect(result.current.scanError?.message).toBe('BCSC.Scan.UnrecognizedQR')
  })

  it('catches strategy errors and surfaces InvalidQrCode', async () => {
    const onConnectionFound = jest.fn()
    const strat = mkStrategy(true, new Error('boom'))
    const { result } = renderHook(() => useScanScreenViewModel({ onConnectionFound, strategies: [strat] }))
    await act(async () => {
      await result.current.handleScan('didcomm://x')
    })
    expect(result.current.scanError?.message).toBe('boom')
  })

  it('skips repeat scans while one is processing or an error is showing', async () => {
    const onConnectionFound = jest.fn()
    let resolveOne: (() => void) | undefined
    const strat: UriStrategy = {
      name: 'slow',
      matches: () => true,
      handle: jest.fn(
        async () => new Promise((res) => (resolveOne = () => res({ kind: 'connection', oobRecordId: 'r' })))
      ),
    }
    const { result } = renderHook(() => useScanScreenViewModel({ onConnectionFound, strategies: [strat] }))
    let firstPromise: Promise<void> | undefined
    await act(async () => {
      firstPromise = result.current.handleScan('didcomm://1')
    })
    // second scan should be ignored
    await act(async () => {
      await result.current.handleScan('didcomm://2')
    })
    expect(strat.handle).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveOne?.()
      await firstPromise
    })
    expect(onConnectionFound).toHaveBeenCalledTimes(1)
  })

  it('dismissError clears scanError', async () => {
    const onConnectionFound = jest.fn()
    const strat = mkStrategy(false, { kind: 'connection', oobRecordId: 'x' })
    const { result } = renderHook(() => useScanScreenViewModel({ onConnectionFound, strategies: [strat] }))
    await act(async () => {
      await result.current.handleScan('https://x')
    })
    expect(result.current.scanError).not.toBeNull()
    act(() => result.current.dismissError())
    expect(result.current.scanError).toBeNull()
  })
})
