import { act, renderHook, waitFor } from '@testing-library/react-native'
import { Share } from 'react-native'

import useQRDisplayViewModel, { QRDisplayStatus } from './useQRDisplayViewModel'

const mockUseConnectionByOutOfBandId = jest.fn<unknown, [string]>(() => undefined)

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useConnectionByOutOfBandId: (oobId: string) => mockUseConnectionByOutOfBandId(oobId),
}))

const makeLogger = () =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

const url = 'didcomm://invite?oob=abc'

// Build a fresh fake credo agent for each test so its mocked `oob.createInvitation`
// can be tweaked per-case without leaking state between tests.
const makeAgent = () => {
  const toUrl = jest.fn(() => url)
  const createInvitation = jest.fn(async () => ({
    id: 'oob-1',
    outOfBandInvitation: { toUrl },
  }))
  const agent = {
    modules: { didcomm: { oob: { createInvitation } } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { agent, createInvitation, toUrl }
}

describe('useQRDisplayViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseConnectionByOutOfBandId.mockReturnValue(undefined)
  })

  it('stays loading and does not call createInvitation when agent is null', async () => {
    const logger = makeLogger()
    const { result } = renderHook(() => useQRDisplayViewModel({ agent: null, logger }))

    expect(result.current.status).toBe(QRDisplayStatus.LOADING)
  })

  it('transitions loading -> ready when invitation resolves', async () => {
    const logger = makeLogger()
    const { agent, createInvitation } = makeAgent()

    const { result } = renderHook(() => useQRDisplayViewModel({ agent, logger }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })

    expect(createInvitation).toHaveBeenCalledTimes(1)
    expect(result.current.invitation).toBe(url)
    expect(result.current.error).toBeNull()
  })

  it('forwards the label option into credo so the scanner gets a meaningful theirLabel', async () => {
    const logger = makeLogger()
    const { agent, createInvitation } = makeAgent()

    renderHook(() => useQRDisplayViewModel({ agent, logger, label: "Kjartan's iPhone" }))

    await waitFor(() => {
      expect(createInvitation).toHaveBeenCalledWith({ label: "Kjartan's iPhone" })
    })
  })

  it('transitions loading -> error when invitation rejects and recovers via retry', async () => {
    const logger = makeLogger()
    const { agent, createInvitation, toUrl } = makeAgent()
    createInvitation.mockRejectedValueOnce(new Error('agent boom'))

    const { result } = renderHook(() => useQRDisplayViewModel({ agent, logger }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.ERROR)
    })
    expect(result.current.error?.message).toBe('agent boom')
    expect(logger.error).toHaveBeenCalled()

    // Next call succeeds with the default factory return.
    createInvitation.mockResolvedValueOnce({ id: 'oob-1', outOfBandInvitation: { toUrl } })

    act(() => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })
    expect(result.current.invitation).toBe(url)
  })

  it('share is a no-op when invitation is undefined', async () => {
    const logger = makeLogger()
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })

    const { result } = renderHook(() => useQRDisplayViewModel({ agent: null, logger }))

    await act(async () => {
      await result.current.share()
    })

    expect(shareSpy).not.toHaveBeenCalled()
    shareSpy.mockRestore()
  })

  it('share invokes Share.share with the resolved invitation URL', async () => {
    const logger = makeLogger()
    const { agent } = makeAgent()
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })

    const { result } = renderHook(() => useQRDisplayViewModel({ agent, logger }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })

    await act(async () => {
      await result.current.share()
    })

    expect(shareSpy).toHaveBeenCalledWith({ message: url })
    expect(logger.info).toHaveBeenCalled()
    shareSpy.mockRestore()
  })

  it('resets to loading and clears invitation when agent flips from ready back to null', async () => {
    const logger = makeLogger()
    const { agent } = makeAgent()

    const { result, rerender } = renderHook(
      ({ agent: a }: { agent: typeof agent | null }) => useQRDisplayViewModel({ agent: a, logger }),
      { initialProps: { agent } }
    )

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })
    expect(result.current.invitation).toBe(url)

    rerender({ agent: null })

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.LOADING)
    })
    expect(result.current.invitation).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('fires onConnectionAccepted exactly once when a connection appears for the invitation', async () => {
    const logger = makeLogger()
    const { agent } = makeAgent()
    const onConnectionAccepted = jest.fn()

    const { result, rerender } = renderHook(() => useQRDisplayViewModel({ agent, logger, onConnectionAccepted }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })
    expect(onConnectionAccepted).not.toHaveBeenCalled()

    // Connection now resolves for the displayed OOB invitation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseConnectionByOutOfBandId.mockReturnValue({ id: 'conn-1' } as any)
    rerender({})

    await waitFor(() => {
      expect(onConnectionAccepted).toHaveBeenCalledWith('conn-1')
    })
    expect(onConnectionAccepted).toHaveBeenCalledTimes(1)

    // Further re-renders with the same connection should not re-fire.
    rerender({})
    expect(onConnectionAccepted).toHaveBeenCalledTimes(1)
  })

  it('logs but does not throw when Share.share rejects', async () => {
    const logger = makeLogger()
    const { agent } = makeAgent()
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('user cancelled'))

    const { result } = renderHook(() => useQRDisplayViewModel({ agent, logger }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })

    await act(async () => {
      await result.current.share()
    })

    expect(logger.error).toHaveBeenCalled()
    shareSpy.mockRestore()
  })
})
