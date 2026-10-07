import { act, renderHook, waitFor } from '@testing-library/react-native'

import { BCSCScreens } from '../../types/navigators'
import { ConnectionInvitationService } from './ConnectionInvitationService'
import { useConnectionInvitationDeepLink } from './useConnectionInvitationDeepLink'

const mockNavigate = jest.fn()
const mockNavigation = { navigate: mockNavigate }
const mockToastShow = jest.fn()
const mockHandle = jest.fn()
const mockStopPickup = jest.fn().mockResolvedValue(undefined)
const mockInitiatePickup = jest.fn().mockResolvedValue(undefined)
const mockAgent = {
  didcomm: { mediationRecipient: { stopMessagePickup: mockStopPickup, initiateMessagePickup: mockInitiatePickup } },
}
const mockAgentState: { agent: unknown; loading: boolean } = { agent: null, loading: true }
let mockService: ConnectionInvitationService
let mockOnSuccess: (oobRecordId: string) => void
let mockStrategyLabel: string | undefined
// handle resolves with the OOB record id, which the real strategy reports through its onSuccess callback
const mockStrategy = {
  matches: jest.fn(),
  handle: async (uri: string) => mockOnSuccess(await mockHandle(uri)),
}

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }))
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: (...args: unknown[]) => mockToastShow(...args) },
}))
jest.mock('@bifold/core', () => ({
  TOKENS: { UTIL_LOGGER: 'logger' },
  useServices: () => [{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }],
}))
jest.mock('@credo-ts/didcomm', () => ({
  DidCommMediatorPickupStrategy: { PickUpV2LiveMode: 'PickUpV2LiveMode' },
}))
jest.mock('@/bcsc-theme/features/agent/BCSCAgentProvider', () => ({ useBCSCAgent: () => mockAgentState }))
jest.mock('./ConnectionInvitationServiceContext', () => ({ useConnectionInvitationService: () => mockService }))
jest.mock('../qr-core/qr-code-strategies/useDidCommOobQRCodeStrategy', () => ({
  useDidCommOobQRCodeStrategy: (onSuccess: (oobRecordId: string) => void, label?: string) => {
    mockOnSuccess = onSuccess
    mockStrategyLabel = label
    return mockStrategy
  },
}))

const INVITATION_URL = 'bcwallet://aries_connection_invitation?oob=eyJhbGciOi'

describe('useConnectionInvitationDeepLink', () => {
  const deliverInvitation = (url = INVITATION_URL) =>
    act(async () => {
      mockService.handleInvitation({ url, source: 'deep-link' })
    })

  const startWithReadyAgent = () => {
    mockAgentState.agent = mockAgent
    mockAgentState.loading = false
    return renderHook(() => useConnectionInvitationDeepLink())
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAgentState.agent = null
    mockAgentState.loading = true
    mockService = new ConnectionInvitationService({ info: jest.fn(), warn: jest.fn() } as any)
  })

  it('keeps the legacy didcomm-oob-invitation label for deep-link invitations', () => {
    startWithReadyAgent()
    expect(mockStrategyLabel).toBe('didcomm-oob-invitation')
  })

  it('defers a cold-start invitation until the agent is ready, then re-kicks pickup and navigates', async () => {
    mockHandle.mockResolvedValue('rec-1')

    const { rerender } = renderHook(() => useConnectionInvitationDeepLink())

    // Invitation arrives while the agent is still initializing — must not process.
    act(() => {
      mockService.handleInvitation({ url: INVITATION_URL, source: 'deep-link' })
    })
    expect(mockHandle).not.toHaveBeenCalled()

    // Agent becomes ready — the buffered invitation is now accepted.
    mockAgentState.agent = mockAgent
    mockAgentState.loading = false
    await act(async () => {
      rerender({})
    })

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.ConnectionLoading, { oobRecordId: 'rec-1' })
    )
    // The #2288 fix: live pickup is fully restarted (stop → start) before navigating
    // so the inviter's response is flushed instead of stuck at the mediator.
    expect(mockStopPickup).toHaveBeenCalled()
    expect(mockInitiatePickup).toHaveBeenCalledWith(undefined, 'PickUpV2LiveMode')
    expect(mockHandle).toHaveBeenCalledWith(INVITATION_URL)
    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('restarts pickup before handing the invitation to the strategy', async () => {
    const order: string[] = []
    mockStopPickup.mockImplementationOnce(async () => void order.push('stop'))
    mockInitiatePickup.mockImplementationOnce(async () => void order.push('start'))
    mockHandle.mockImplementation(async () => {
      order.push('handle')
      return 'rec-1'
    })

    startWithReadyAgent()
    await deliverInvitation()

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled())
    expect(order).toEqual(['stop', 'start', 'handle'])
  })

  it('still accepts the invitation when stopping or restarting pickup fails', async () => {
    mockStopPickup.mockRejectedValueOnce(new Error('no live session'))
    mockInitiatePickup.mockRejectedValueOnce(new Error('socket'))
    mockHandle.mockResolvedValue('rec-1')

    startWithReadyAgent()
    await deliverInvitation()

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(BCSCScreens.ConnectionLoading, { oobRecordId: 'rec-1' })
    )
    expect(mockToastShow).not.toHaveBeenCalled()
  })

  it('surfaces a toast and does not navigate when the strategy rejects the invitation', async () => {
    mockHandle.mockRejectedValue(new Error('unsupported'))

    startWithReadyAgent()
    await deliverInvitation()

    await waitFor(() => expect(mockToastShow).toHaveBeenCalledWith({ type: 'error', text1: expect.any(String) }))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('processes a second invitation after the first one completes', async () => {
    mockHandle.mockResolvedValueOnce('rec-1').mockResolvedValueOnce('rec-2')

    startWithReadyAgent()
    await deliverInvitation()
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1))

    await deliverInvitation('bcwallet://aries_connection_invitation?oob=second')
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(2))

    expect(mockNavigate).toHaveBeenLastCalledWith(BCSCScreens.ConnectionLoading, { oobRecordId: 'rec-2' })
  })

  it('does not navigate when the hook unmounts while the invitation is still being handled', async () => {
    let resolveHandle: (oobRecordId: string) => void = () => undefined
    mockHandle.mockReturnValue(new Promise<string>((resolve) => (resolveHandle = resolve)))

    const { unmount } = startWithReadyAgent()
    await deliverInvitation()
    await waitFor(() => expect(mockHandle).toHaveBeenCalled())

    unmount()
    await act(async () => {
      resolveHandle('rec-1')
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not show a toast when the hook unmounts and the pending handle then rejects', async () => {
    let rejectHandle: (error: Error) => void = () => undefined
    mockHandle.mockReturnValue(new Promise<string>((_resolve, reject) => (rejectHandle = reject)))

    const { unmount } = startWithReadyAgent()
    await deliverInvitation()
    await waitFor(() => expect(mockHandle).toHaveBeenCalled())

    unmount()
    await act(async () => {
      rejectHandle(new Error('network'))
    })

    expect(mockToastShow).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('ignores an invitation that arrives after unmount', async () => {
    mockHandle.mockResolvedValue('rec-1')

    const { unmount } = startWithReadyAgent()
    unmount()
    await deliverInvitation()

    expect(mockHandle).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
