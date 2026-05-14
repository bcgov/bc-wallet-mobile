import * as Bifold from '@bifold/core'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { Share } from 'react-native'

import useQRDisplayViewModel, { QRDisplayStatus } from './useQRDisplayViewModel'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  createConnectionInvitation: jest.fn(),
}))

const mockCreateInvitation = jest.mocked(Bifold.createConnectionInvitation)

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeAgent = {} as any

const url = 'https://realhost.example/invitation?oob=abc'

describe('useQRDisplayViewModel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('stays loading and does not call createConnectionInvitation when agent is null', async () => {
    const logger = makeLogger()
    const { result } = renderHook(() => useQRDisplayViewModel({ agent: null, logger }))

    expect(result.current.status).toBe(QRDisplayStatus.LOADING)
    expect(mockCreateInvitation).not.toHaveBeenCalled()
  })

  it('transitions loading -> ready when invitation resolves', async () => {
    const logger = makeLogger()
    mockCreateInvitation.mockResolvedValueOnce({
      invitationUrl: url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      record: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invitation: {} as any,
    })

    const { result } = renderHook(() => useQRDisplayViewModel({ agent: fakeAgent, logger }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.READY)
    })

    expect(result.current.invitation).toBe(url)
    expect(result.current.error).toBeNull()
  })

  it('transitions loading -> error when invitation rejects and recovers via retry', async () => {
    const logger = makeLogger()
    mockCreateInvitation.mockRejectedValueOnce(new Error('agent boom'))

    const { result } = renderHook(() => useQRDisplayViewModel({ agent: fakeAgent, logger }))

    await waitFor(() => {
      expect(result.current.status).toBe(QRDisplayStatus.ERROR)
    })
    expect(result.current.error?.message).toBe('agent boom')
    expect(logger.error).toHaveBeenCalled()

    mockCreateInvitation.mockResolvedValueOnce({
      invitationUrl: url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      record: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invitation: {} as any,
    })

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
    mockCreateInvitation.mockResolvedValueOnce({
      invitationUrl: url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      record: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invitation: {} as any,
    })
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })

    const { result } = renderHook(() => useQRDisplayViewModel({ agent: fakeAgent, logger }))

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
    mockCreateInvitation.mockResolvedValueOnce({
      invitationUrl: url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      record: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invitation: {} as any,
    })

    const { result, rerender } = renderHook(
      ({ agent }: { agent: typeof fakeAgent | null }) => useQRDisplayViewModel({ agent, logger }),
      { initialProps: { agent: fakeAgent } }
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

  it('logs but does not throw when Share.share rejects', async () => {
    const logger = makeLogger()
    mockCreateInvitation.mockResolvedValueOnce({
      invitationUrl: url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      record: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      invitation: {} as any,
    })
    const shareSpy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('user cancelled'))

    const { result } = renderHook(() => useQRDisplayViewModel({ agent: fakeAgent, logger }))

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
