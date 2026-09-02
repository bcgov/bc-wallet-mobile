import { act, renderHook, waitFor } from '@testing-library/react-native'

import { useNotifications } from './notifications'

const mockUseStore = jest.fn()
const mockUseBasicMessages = jest.fn()
const mockUseCredentialByState = jest.fn()
const mockUseOptionalAgent = jest.fn()
const mockUseProofByState = jest.fn()
const mockIsProofRequestingAttestation = jest.fn()
const mockDeclineProofRequest = jest.fn()

const PROOF_EXPIRATION_TIMES = {
  TwoMinutes: 2 * 60 * 1000,
  OneHour: 60 * 60 * 1000,
  FortyEightHours: 48 * 60 * 60 * 1000,
  SevenDays: 7 * 24 * 60 * 60 * 1000,
  Never: 0,
}

jest.mock('@/constants', () => ({
  AttestationRestrictions: {},
  NOTIFICATION_REFRESH_INTERVAL_MS: 60_000,
}))

jest.mock('@/hooks/useDeclineProofRequest', () => ({
  declineProofRequest: (...args: unknown[]) => mockDeclineProofRequest(...args),
}))

jest.mock('@services/attestation', () => ({
  isProofRequestingAttestation: (...args: unknown[]) => mockIsProofRequestingAttestation(...args),
}))

jest.mock('@utils/bc-agent-modules', () => ({}))

// Local mock with a STABLE t reference. The shared __mocks__/react-i18next returns a
// fresh t on every render, which would defeat the decline effect's in-flight de-dupe
// guard (t is one of its deps) and is not how i18next behaves in the app.
jest.mock('react-i18next', () => {
  const t = (key: string) => key
  return {
    useTranslation: () => ({ t, i18n: { language: 'en', changeLanguage: jest.fn() } }),
  }
})

jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
  BasicMessageMetadata: { customMetadata: 'customMetadata' },
  CredentialMetadata: { customMetadata: 'customMetadata' },
  ProofRequestExpirationTime: {
    TwoMinutes: 2 * 60 * 1000,
    OneHour: 60 * 60 * 1000,
    FortyEightHours: 48 * 60 * 60 * 1000,
    SevenDays: 7 * 24 * 60 * 60 * 1000,
    Never: 0,
  },
}))

jest.mock('@bifold/verifier', () => ({
  ProofMetadata: { customMetadata: 'customMetadata' },
}))

jest.mock('@bifold/react-hooks', () => ({
  useBasicMessages: () => mockUseBasicMessages(),
  useCredentialByState: () => mockUseCredentialByState(),
  useOptionalAgent: () => mockUseOptionalAgent(),
  useProofByState: (state: unknown) => mockUseProofByState(state),
}))

const PROOF_STATE_REQUEST_RECEIVED = 'request-received'
const PROOF_STATE_DONE = 'done'
const PROOF_STATE_PRESENTATION_RECEIVED = 'presentation-received'

type FakeProof = {
  id: string
  connectionId?: string
  state: string
  createdAt: Date
  isVerified?: boolean
  metadata: { data: Record<string, unknown>; get: jest.Mock }
}

const HOUR_MS = 60 * 60 * 1000

const makeProof = (overrides: Partial<FakeProof> = {}): FakeProof => ({
  id: 'proof-1',
  connectionId: 'connection-1',
  state: PROOF_STATE_REQUEST_RECEIVED,
  // Default to something created an hour ago so it is "expired" under short TTLs
  createdAt: new Date(Date.now() - HOUR_MS),
  isVerified: undefined,
  metadata: { data: {}, get: jest.fn() },
  ...overrides,
})

const fakeAgent = { config: { logger: { error: jest.fn() } } }

let proofsRequested: FakeProof[] = []
let proofsDone: FakeProof[] = []

const setStore = (proofRequestExpirationMs: number | undefined) => {
  mockUseStore.mockReturnValue([
    {
      preferences: { proofRequestExpirationMs },
      dismissPersonCredentialOffer: { personCredentialOfferDismissed: false },
    },
    jest.fn(),
  ])
}

// Wait for the async isProofRequestingAttestation pipeline to settle so that the
// nonAttestationProofs state (and the decline effect that depends on it) has run.
const flushNonAttestationProofs = async () => {
  await waitFor(() => expect(mockIsProofRequestingAttestation).toHaveBeenCalled())
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useNotifications - proof request expiry', () => {
  beforeEach(() => {
    proofsRequested = []
    proofsDone = []
    mockUseBasicMessages.mockReturnValue({ records: [] })
    mockUseCredentialByState.mockReturnValue([])
    mockUseOptionalAgent.mockReturnValue({ agent: fakeAgent })
    mockUseProofByState.mockImplementation((state: unknown) =>
      Array.isArray(state) ? proofsDone : proofsRequested
    )
    mockIsProofRequestingAttestation.mockResolvedValue(false)
    mockDeclineProofRequest.mockResolvedValue(undefined)
    setStore(PROOF_EXPIRATION_TIMES.TwoMinutes)
  })

  describe('auto-decline of expired proof requests', () => {
    it('declines a pending proof request once it has expired', async () => {
      const proof = makeProof({ id: 'expired-proof', createdAt: new Date(Date.now() - HOUR_MS) })
      proofsRequested = [proof]

      renderHook(() => useNotifications())

      await waitFor(() => expect(mockDeclineProofRequest).toHaveBeenCalledTimes(1))
      expect(mockDeclineProofRequest).toHaveBeenCalledWith(fakeAgent, proof, 'ProofRequest.Declined')
    })

    it('does not decline a pending proof request that has not expired yet', async () => {
      proofsRequested = [makeProof({ id: 'fresh-proof', createdAt: new Date() })]

      renderHook(() => useNotifications())

      await flushNonAttestationProofs()
      expect(mockDeclineProofRequest).not.toHaveBeenCalled()
    })

    it('does not decline anything when the expiration preference is Never (0)', async () => {
      setStore(PROOF_EXPIRATION_TIMES.Never)
      proofsRequested = [makeProof({ id: 'old-proof', createdAt: new Date(Date.now() - 30 * 24 * HOUR_MS) })]

      renderHook(() => useNotifications())

      await flushNonAttestationProofs()
      expect(mockDeclineProofRequest).not.toHaveBeenCalled()
    })

    it('falls back to the 48 hour default when no preference is set', async () => {
      setStore(undefined)
      // 47h old -> still within the 48h default, must not be declined
      proofsRequested = [makeProof({ id: 'within-default', createdAt: new Date(Date.now() - 47 * HOUR_MS) })]

      const { rerender } = renderHook(() => useNotifications())
      await flushNonAttestationProofs()
      expect(mockDeclineProofRequest).not.toHaveBeenCalled()

      // 49h old -> past the 48h default, must be declined
      proofsRequested = [makeProof({ id: 'past-default', createdAt: new Date(Date.now() - 49 * HOUR_MS) })]
      rerender({})

      await waitFor(() => expect(mockDeclineProofRequest).toHaveBeenCalledTimes(1))
      expect(mockDeclineProofRequest).toHaveBeenCalledWith(
        fakeAgent,
        expect.objectContaining({ id: 'past-default' }),
        'ProofRequest.Declined'
      )
    })

    it('does not decline proof requests that are already in a done state', async () => {
      proofsDone = [
        makeProof({ id: 'done-proof', state: PROOF_STATE_DONE, createdAt: new Date(Date.now() - HOUR_MS) }),
        makeProof({
          id: 'presented-proof',
          state: PROOF_STATE_PRESENTATION_RECEIVED,
          createdAt: new Date(Date.now() - HOUR_MS),
        }),
      ]

      renderHook(() => useNotifications())

      await flushNonAttestationProofs()
      expect(mockDeclineProofRequest).not.toHaveBeenCalled()
    })

    it('does not decline when there is no agent', async () => {
      mockUseOptionalAgent.mockReturnValue({ agent: undefined })
      proofsRequested = [makeProof({ id: 'expired-proof', createdAt: new Date(Date.now() - HOUR_MS) })]

      renderHook(() => useNotifications())

      await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(mockDeclineProofRequest).not.toHaveBeenCalled()
    })

    it('does not decline expired requests that are attestation proofs', async () => {
      mockIsProofRequestingAttestation.mockResolvedValue(true)
      proofsRequested = [makeProof({ id: 'attestation-proof', createdAt: new Date(Date.now() - HOUR_MS) })]

      renderHook(() => useNotifications())

      await flushNonAttestationProofs()
      expect(mockDeclineProofRequest).not.toHaveBeenCalled()
    })

    it('declines every expired proof request in the list', async () => {
      proofsRequested = [
        makeProof({ id: 'expired-a', connectionId: 'conn-a', createdAt: new Date(Date.now() - HOUR_MS) }),
        makeProof({ id: 'expired-b', connectionId: 'conn-b', createdAt: new Date(Date.now() - 2 * HOUR_MS) }),
      ]

      renderHook(() => useNotifications())

      await waitFor(() => expect(mockDeclineProofRequest).toHaveBeenCalledTimes(2))
      expect(mockDeclineProofRequest).toHaveBeenCalledWith(
        fakeAgent,
        expect.objectContaining({ id: 'expired-a' }),
        'ProofRequest.Declined'
      )
      expect(mockDeclineProofRequest).toHaveBeenCalledWith(
        fakeAgent,
        expect.objectContaining({ id: 'expired-b' }),
        'ProofRequest.Declined'
      )
    })

    it('declines each expired proof only once while a decline is still in flight', async () => {
      // Never resolves, so the in-flight guard (decliningProofIds) is what must prevent a repeat call
      mockDeclineProofRequest.mockReturnValue(new Promise(() => {}))
      proofsRequested = [makeProof({ id: 'expired-proof', createdAt: new Date(Date.now() - HOUR_MS) })]

      const { rerender } = renderHook(() => useNotifications())

      await waitFor(() => expect(mockDeclineProofRequest).toHaveBeenCalledTimes(1))

      rerender({})
      rerender({})
      await act(async () => {
        await Promise.resolve()
      })

      expect(mockDeclineProofRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('notification list filtering by expiry', () => {
    it('drops an expired pending proof from the returned notifications but keeps a fresh one', async () => {
      proofsRequested = [
        makeProof({ id: 'expired-proof', connectionId: 'conn-old', createdAt: new Date(Date.now() - HOUR_MS) }),
        makeProof({ id: 'fresh-proof', connectionId: 'conn-new', createdAt: new Date() }),
      ]

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect((result.current[0] as unknown as FakeProof).id).toBe('fresh-proof')
    })

    it('keeps an old pending proof in the list when expiry is disabled (Never)', async () => {
      setStore(PROOF_EXPIRATION_TIMES.Never)
      proofsRequested = [
        makeProof({ id: 'old-proof', createdAt: new Date(Date.now() - 30 * 24 * HOUR_MS) }),
      ]

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect((result.current[0] as unknown as FakeProof).id).toBe('old-proof')
    })

    it('includes a fresh pending proof in the notifications list', async () => {
      proofsRequested = [makeProof({ id: 'fresh-proof', createdAt: new Date() })]

      const { result } = renderHook(() => useNotifications())

      await waitFor(() => {
        expect(result.current).toHaveLength(1)
      })
      expect((result.current[0] as unknown as FakeProof).id).toBe('fresh-proof')
    })
  })
})
