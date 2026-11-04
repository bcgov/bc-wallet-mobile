import { AttestationRestrictions } from '@/constants'
import {
  allCredDefIds,
  AttestationMonitor,
  isOfferingAttestation,
  isProofRequestingAttestation,
} from '@/services/attestation'
import { AttestationEventTypes, MockLogger } from '@bifold/core'
import { appleAttestation, generateKey } from '@bifold/react-native-attestation'
import { DidCommCredentialEventTypes, DidCommProofEventTypes, DidCommProofState } from '@credo-ts/didcomm'
import { requestAttestationDrpc, requestNonceDrpc } from '@utils/drpc'
import { DeviceEventEmitter } from 'react-native'

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  removeExistingInvitationsById: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@bifold/react-native-attestation', () => ({
  generateKey: jest.fn(),
  appleAttestation: jest.fn(),
  googleAttestation: jest.fn(),
  isPlayIntegrityAvailable: jest.fn(),
}))

jest.mock('@utils/drpc', () => ({
  requestNonceDrpc: jest.fn(),
  requestAttestationDrpc: jest.fn(),
}))

const mockedGenerateKey = generateKey as jest.Mock
const mockedAppleAttestation = appleAttestation as jest.Mock
const mockedRequestNonceDrpc = requestNonceDrpc as jest.Mock
const mockedRequestAttestationDrpc = requestAttestationDrpc as jest.Mock

type Handler = (event: any) => void | Promise<void>

const DEV_CRED_DEF_ID = AttestationRestrictions.Development.credDefIDs[0]
const TEST_CRED_DEF_ID = AttestationRestrictions.Test.credDefIDs[0]

/**
 * Mock BCAgent with per-event-type handler tracking, so tests can emit events onto
 * the observable AttestationMonitor subscribes to and assert on subscription teardown.
 */
const createMockAgent = () => {
  // Tracked as a list of handles rather than a set of handlers: the monitor's
  // handlers are bound class properties, so a set would dedupe by identity and
  // hide a subscription that was created but never unsubscribed.
  const subscriptions: Record<string, { handler: Handler; active: boolean }[]> = {}
  return {
    activeSubscriptions: (eventType: string) => (subscriptions[eventType] ?? []).filter((s) => s.active).length,
    config: { logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
    events: {
      observable: (eventType: string) => ({
        subscribe: (handler: Handler) => {
          const entry = { handler, active: true }
          ;(subscriptions[eventType] ??= []).push(entry)
          return {
            unsubscribe: () => {
              entry.active = false
            },
          }
        },
      }),
    },
    didcomm: {
      oob: {
        parseInvitation: jest.fn().mockResolvedValue({ id: 'invitation-id' }),
        receiveInvitation: jest.fn().mockResolvedValue({ connectionRecord: { id: 'connection-id' } }),
      },
      connections: {
        returnWhenIsConnected: jest.fn().mockResolvedValue({ id: 'connection-id' }),
      },
      proofs: {
        getFormatData: jest.fn(),
        getById: jest.fn().mockResolvedValue({ id: 'proof-id' }),
        declineRequest: jest.fn().mockResolvedValue(undefined),
      },
      credentials: {
        getFormatData: jest.fn(),
        acceptOffer: jest.fn().mockResolvedValue(undefined),
      },
    },
    async emit(eventType: string, payload: any) {
      for (const s of (subscriptions[eventType] ?? []).filter((entry) => entry.active)) {
        await s.handler({ payload })
      }
    },
  }
}

/** A proof request asking for an attestation credential from the given cred def. */
const attestationProofFormat = (credDefId: string) => ({
  request: {
    anoncreds: {
      requested_attributes: {
        attestationInfo: { restrictions: [{ cred_def_id: credDefId }] },
      },
    },
  },
})

const proofRecord = { id: 'proof-id', state: DidCommProofState.RequestReceived } as any

describe('attestation restriction helpers', () => {
  it('collects cred def ids across every environment', () => {
    const all = allCredDefIds(AttestationRestrictions)

    expect(all).toContain(DEV_CRED_DEF_ID)
    expect(all).toContain(TEST_CRED_DEF_ID)
    expect(all).toContain(AttestationRestrictions.Production.credDefIDs[0])
  })

  it('recognises an offer for any environment, not just the matched one', () => {
    expect(isOfferingAttestation(DEV_CRED_DEF_ID, AttestationRestrictions)).toBe(true)
    expect(isOfferingAttestation(TEST_CRED_DEF_ID, AttestationRestrictions)).toBe(true)
    expect(isOfferingAttestation('issuer:3:CL:1:unknown', AttestationRestrictions)).toBe(false)
  })

  describe('isProofRequestingAttestation', () => {
    it('is true for an anoncreds proof restricted to a known attestation cred def', async () => {
      const agent = createMockAgent()
      agent.didcomm.proofs.getFormatData.mockResolvedValue(attestationProofFormat(TEST_CRED_DEF_ID))

      await expect(isProofRequestingAttestation(proofRecord, agent as any, AttestationRestrictions)).resolves.toBe(true)
    })

    it('is true for the legacy indy format shape', async () => {
      const agent = createMockAgent()
      agent.didcomm.proofs.getFormatData.mockResolvedValue({
        request: {
          indy: {
            requested_attributes: {
              attestationInfo: { restrictions: [{ cred_def_id: DEV_CRED_DEF_ID }] },
            },
          },
        },
      })

      await expect(isProofRequestingAttestation(proofRecord, agent as any, AttestationRestrictions)).resolves.toBe(true)
    })

    it('is false for a cred def that belongs to no configured environment', async () => {
      const agent = createMockAgent()
      agent.didcomm.proofs.getFormatData.mockResolvedValue(attestationProofFormat('issuer:3:CL:1:unknown'))

      await expect(isProofRequestingAttestation(proofRecord, agent as any, AttestationRestrictions)).resolves.toBe(
        false
      )
    })

    it('is false when the proof carries no attestationInfo restrictions', async () => {
      const agent = createMockAgent()
      agent.didcomm.proofs.getFormatData.mockResolvedValue({
        request: { anoncreds: { requested_attributes: { someOtherGroup: { restrictions: [] } } } },
      })

      await expect(isProofRequestingAttestation(proofRecord, agent as any, AttestationRestrictions)).resolves.toBe(
        false
      )
    })
  })
})

describe('AttestationMonitor', () => {
  let agent: ReturnType<typeof createMockAgent>

  beforeEach(() => {
    jest.clearAllMocks()
    agent = createMockAgent()

    // A complete attestation flow, so tests that need the workflow to reach the
    // DRPC exchange do not fall out early on a mock returning undefined.
    mockedGenerateKey.mockResolvedValue('key-id')
    mockedAppleAttestation.mockResolvedValue(Buffer.from('attestation-object'))
    mockedRequestNonceDrpc.mockResolvedValue(jest.fn().mockResolvedValue({ result: { nonce: 'nonce-1' } }))
    mockedRequestAttestationDrpc.mockResolvedValue(jest.fn().mockResolvedValue({ result: { status: 'success' } }))
  })

  const buildMonitor = (enabled: boolean) => new AttestationMonitor(new MockLogger(), { enabled })

  describe('the enabled gate', () => {
    it('ignores proof requests entirely when disabled', async () => {
      const monitor = buildMonitor(false)
      monitor.start(agent as any)

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, { proofRecord })

      expect(agent.didcomm.proofs.getFormatData).not.toHaveBeenCalled()
    })

    it('inspects proof requests when enabled', async () => {
      const monitor = buildMonitor(true)
      agent.didcomm.proofs.getFormatData.mockResolvedValue(attestationProofFormat('issuer:3:CL:1:unknown'))
      monitor.start(agent as any)

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, { proofRecord })

      expect(agent.didcomm.proofs.getFormatData).toHaveBeenCalled()
    })

    it('honours the setter after construction, so the toggle applies without an agent restart', async () => {
      const monitor = buildMonitor(true)
      monitor.start(agent as any)
      monitor.enabled = false

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, { proofRecord })

      expect(monitor.enabled).toBe(false)
      expect(agent.didcomm.proofs.getFormatData).not.toHaveBeenCalled()
    })

    it('declines to attempt attestation for a delegated proof when disabled', async () => {
      const monitor = buildMonitor(false)
      monitor.start(agent as any)
      const started = jest.fn()
      const subscription = DeviceEventEmitter.addListener(AttestationEventTypes.Started, started)

      await expect(monitor.attemptAttestationForProof(proofRecord)).resolves.toBe(false)

      // No workflow should begin, so AutoCredentialMonitor falls through to
      // declining with a problem report rather than waiting on the timeout.
      expect(started).not.toHaveBeenCalled()
      expect(monitor.attestationWorkflowInProgress).toBe(false)
      subscription.remove()
    })
  })

  describe('start and stop', () => {
    it('does not leak subscriptions when started more than once', () => {
      const monitor = buildMonitor(true)

      // A workflow restarts the monitor, and overwriting a live handle would
      // leave a subscription that can never be unsubscribed.
      monitor.start(agent as any)
      monitor.start(agent as any)

      expect(agent.activeSubscriptions(DidCommProofEventTypes.ProofStateChanged)).toBe(1)
      expect(agent.activeSubscriptions(DidCommCredentialEventTypes.DidCommCredentialStateChanged)).toBe(1)
    })

    it('handles a proof once, not once per start', async () => {
      const monitor = buildMonitor(true)
      agent.didcomm.proofs.getFormatData.mockResolvedValue(attestationProofFormat('issuer:3:CL:1:unknown'))

      monitor.start(agent as any)
      monitor.start(agent as any)
      await agent.emit(DidCommProofEventTypes.ProofStateChanged, { proofRecord })

      expect(agent.didcomm.proofs.getFormatData).toHaveBeenCalledTimes(1)
    })

    it('unsubscribes everything on stop', async () => {
      const monitor = buildMonitor(true)
      agent.didcomm.proofs.getFormatData.mockResolvedValue(attestationProofFormat(TEST_CRED_DEF_ID))
      monitor.start(agent as any)

      monitor.stop()
      await agent.emit(DidCommProofEventTypes.ProofStateChanged, { proofRecord })

      expect(agent.activeSubscriptions(DidCommProofEventTypes.ProofStateChanged)).toBe(0)
      expect(agent.didcomm.proofs.getFormatData).not.toHaveBeenCalled()
    })
  })

  describe('attemptAttestationForProof', () => {
    beforeEach(() => {
      agent.didcomm.proofs.getFormatData.mockResolvedValue(attestationProofFormat(TEST_CRED_DEF_ID))
    })

    it('resolves true once the exchange completes', async () => {
      const monitor = buildMonitor(true)
      monitor.start(agent as any)

      const outcome = monitor.attemptAttestationForProof(proofRecord, 2000)
      DeviceEventEmitter.emit(AttestationEventTypes.Completed)

      await expect(outcome).resolves.toBe(true)
    })

    it.each([
      AttestationEventTypes.FailedRequestCredential,
      AttestationEventTypes.FailedHandleOffer,
      AttestationEventTypes.FailedHandleProof,
    ])('resolves false on %s', async (eventType) => {
      const monitor = buildMonitor(true)
      monitor.start(agent as any)

      const outcome = monitor.attemptAttestationForProof(proofRecord, 2000)
      DeviceEventEmitter.emit(eventType)

      await expect(outcome).resolves.toBe(false)
    })

    it('resolves false when the credential never arrives, rather than hanging', async () => {
      const monitor = buildMonitor(true)
      monitor.start(agent as any)

      // The DRPC response is only halfway; without the timeout the caller would
      // wait forever and leave the triggering proof unanswered.
      await expect(monitor.attemptAttestationForProof(proofRecord, 10)).resolves.toBe(false)
      expect(monitor.attestationWorkflowInProgress).toBe(false)
    })

    it('omits credential_protocol so the controller picks its per-environment default', async () => {
      const monitor = buildMonitor(true)
      monitor.start(agent as any)

      await monitor.attemptAttestationForProof(proofRecord, 10)

      expect(mockedRequestAttestationDrpc).toHaveBeenCalled()
      const params = mockedRequestAttestationDrpc.mock.calls[0][2]
      expect(params).not.toHaveProperty('credential_protocol')
      expect(params.platform).toBe('apple')
    })

    it('connects to the attestation agent named by the proof restrictions', async () => {
      const monitor = buildMonitor(true)
      monitor.start(agent as any)

      await monitor.attemptAttestationForProof(proofRecord, 10)

      // The issuer's proof request, not the build target, selects the environment.
      expect(agent.didcomm.oob.parseInvitation).toHaveBeenCalledWith(AttestationRestrictions.Test.invitationUrl)
    })
  })
})
