import { renderHook } from '@testing-library/react-native'
import {
  DidCommBasicMessageRecord,
  DidCommCredentialExchangeRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
  DidCommProofState,
} from '@credo-ts/didcomm'

const mockUseBasicMessages = jest.fn<DidCommBasicMessageRecord[], [string]>()
const mockUseCredentials = jest.fn<DidCommCredentialExchangeRecord[], [string]>()
const mockUseProofs = jest.fn<DidCommProofExchangeRecord[], [string]>()

jest.mock('@bifold/react-hooks', () => ({
  useBasicMessagesByConnectionId: (id: string) => mockUseBasicMessages(id),
  useCredentialsByConnectionId: (id: string) => mockUseCredentials(id),
  useProofsByConnectionId: (id: string) => mockUseProofs(id),
}))

// react-i18next mock in this project echoes the key back as the translation.
// eslint-disable-next-line import/first
import { useContactSubtitle } from './useContactSubtitle'

const basicMessage = (overrides: Partial<DidCommBasicMessageRecord>) =>
  ({ content: 'hi', createdAt: new Date(0), ...overrides }) as DidCommBasicMessageRecord

const credential = (state: DidCommCredentialState, createdAt: Date) =>
  ({ state, createdAt }) as DidCommCredentialExchangeRecord

const proof = (state: DidCommProofState, createdAt: Date, isVerified?: boolean) =>
  ({ state, createdAt, isVerified }) as DidCommProofExchangeRecord

describe('useContactSubtitle', () => {
  beforeEach(() => {
    mockUseBasicMessages.mockReset().mockReturnValue([])
    mockUseCredentials.mockReset().mockReturnValue([])
    mockUseProofs.mockReset().mockReturnValue([])
  })

  it('returns undefined when there is no activity', () => {
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBeUndefined()
  })

  it('returns the most recent basic message when it is newest', () => {
    mockUseBasicMessages.mockReturnValue([
      basicMessage({ content: 'older', createdAt: new Date(1000) }),
      basicMessage({ content: 'newest', createdAt: new Date(3000) }),
    ])
    mockUseCredentials.mockReturnValue([credential(DidCommCredentialState.OfferReceived, new Date(2000))])
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBe('newest')
  })

  it('picks a credential event when it is the latest', () => {
    mockUseBasicMessages.mockReturnValue([basicMessage({ content: 'old', createdAt: new Date(1000) })])
    mockUseCredentials.mockReturnValue([credential(DidCommCredentialState.CredentialReceived, new Date(5000))])
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBe('Chat.CredentialReceived')
  })

  it('picks a proof event when it is the latest', () => {
    mockUseProofs.mockReturnValue([proof(DidCommProofState.PresentationReceived, new Date(9999))])
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBe('Chat.ProofPresentationReceived')
  })

  it('treats Done proofs as satisfied when isVerified is unset', () => {
    mockUseProofs.mockReturnValue([proof(DidCommProofState.Done, new Date(1))])
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBe('Chat.ProofRequestSatisfied')
  })

  it('treats Done proofs as PresentationReceived when isVerified is set', () => {
    mockUseProofs.mockReturnValue([proof(DidCommProofState.Done, new Date(1), true)])
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBe('Chat.ProofPresentationReceived')
  })

  it('skips basic messages with empty content', () => {
    mockUseBasicMessages.mockReturnValue([basicMessage({ content: '', createdAt: new Date(9999) })])
    mockUseCredentials.mockReturnValue([credential(DidCommCredentialState.OfferReceived, new Date(1))])
    const { result } = renderHook(() => useContactSubtitle('conn-1'))
    expect(result.current).toBe('Chat.CredentialOfferReceived')
  })
})
