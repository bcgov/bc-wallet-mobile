import { act, renderHook, waitFor } from '@testing-library/react-native'

import { BCSCScreens } from '../../types/navigators'
import { ConnectionInvitationService } from './ConnectionInvitationService'
import { useConnectionInvitationDeepLink } from './useConnectionInvitationDeepLink'

const mockNavigate = jest.fn()
const mockToastShow = jest.fn()
const mockHandle = jest.fn()
const mockStopPickup = jest.fn().mockResolvedValue(undefined)
const mockInitiatePickup = jest.fn().mockResolvedValue(undefined)
const mockAgent = {
  didcomm: { mediationRecipient: { stopMessagePickup: mockStopPickup, initiateMessagePickup: mockInitiatePickup } },
}
const mockAgentState: { agent: unknown; loading: boolean } = { agent: null, loading: true }
let mockService: ConnectionInvitationService

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }))
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
jest.mock('../qr-core/uri-strategies', () => ({
  DidCommOobStrategy: { handle: (...args: unknown[]) => mockHandle(...args) },
}))
jest.mock('./ConnectionInvitationServiceContext', () => ({ useConnectionInvitationService: () => mockService }))

const INVITATION_URL = 'bcwallet://aries_connection_invitation?oob=eyJhbGciOi'

describe('useConnectionInvitationDeepLink', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAgentState.agent = null
    mockAgentState.loading = true
    mockService = new ConnectionInvitationService({ info: jest.fn(), warn: jest.fn() } as any)
  })

  it('defers a cold-start invitation until the agent is ready, then re-kicks pickup and navigates', async () => {
    mockHandle.mockResolvedValue({ kind: 'connection', oobRecordId: 'rec-1' })

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
    expect(mockHandle).toHaveBeenCalledWith(INVITATION_URL, expect.objectContaining({ agent: mockAgent }))
  })

  it('surfaces a toast and does not navigate when the invitation is unsupported', async () => {
    mockAgentState.agent = mockAgent
    mockAgentState.loading = false
    mockHandle.mockResolvedValue({ kind: 'unsupported', reason: 'OpenID' })

    renderHook(() => useConnectionInvitationDeepLink())
    await act(async () => {
      mockService.handleInvitation({ url: INVITATION_URL, source: 'deep-link' })
    })

    await waitFor(() => expect(mockToastShow).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('surfaces a toast when accepting the invitation throws', async () => {
    mockAgentState.agent = mockAgent
    mockAgentState.loading = false
    mockHandle.mockRejectedValue(new Error('network'))

    renderHook(() => useConnectionInvitationDeepLink())
    await act(async () => {
      mockService.handleInvitation({ url: INVITATION_URL, source: 'deep-link' })
    })

    await waitFor(() => expect(mockToastShow).toHaveBeenCalled())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
