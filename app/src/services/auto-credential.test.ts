import { AutoCredentialMonitor, AutoCredentialRule } from '@/services/auto-credential'
import { CredentialProvisioningEventTypes, MockLogger } from '@bifold/core'
import {
  DidCommCredentialEventTypes,
  DidCommCredentialState,
  DidCommProofEventTypes,
  DidCommProofState,
} from '@credo-ts/didcomm'
import { credentialsMatchForProof } from '@utils/credentials'
import { DeviceEventEmitter } from 'react-native'

jest.mock('@utils/credentials', () => ({
  credentialsMatchForProof: jest.fn(),
}))

const mockedCredentialsMatchForProof = credentialsMatchForProof as jest.Mock

type Handler = (event: any) => void | Promise<void>

/**
 * Mock BCAgent with per-event-type handler tracking so tests can synthetically
 * emit events onto the observable that AutoCredentialMonitor subscribes to.
 */
const createMockAgent = () => {
  const handlers: Record<string, Set<Handler>> = {}
  return {
    events: {
      observable: (eventType: string) => ({
        subscribe: (handler: Handler) => {
          const bucket = (handlers[eventType] ??= new Set())
          bucket.add(handler)
          return { unsubscribe: () => bucket.delete(handler) }
        },
      }),
    },
    didcomm: {
      oob: {
        parseInvitation: jest.fn(),
        receiveInvitation: jest.fn(),
      },
      proofs: {
        getFormatData: jest.fn(),
        declineRequest: jest.fn().mockResolvedValue(undefined),
      },
      credentials: {
        acceptOffer: jest.fn().mockResolvedValue(undefined),
      },
    },
    // Test helper: fire the given payload at every handler subscribed to eventType
    // and await each handler so async work settles before assertions.
    async emit(eventType: string, payload: any) {
      const bucket = handlers[eventType]
      if (!bucket) return
      for (const h of Array.from(bucket)) {
        await h({ payload })
      }
    },
  }
}

const TRIGGER_CRED_DEF_ID = 'issuer:3:CL:1:Person'

const buildRule = (overrides: Partial<AutoCredentialRule> = {}): AutoCredentialRule => ({
  triggerCredDefIds: [TRIGGER_CRED_DEF_ID],
  getInvitationUrl: jest.fn().mockResolvedValue('https://issuer.example?c_i=abc'),
  autoAcceptIssuerProofRequest: true,
  autoAcceptCredentialOffer: true,
  ...overrides,
})

const proofFormat = (credDefId: string) => ({
  request: {
    anoncreds: {
      requested_attributes: {
        group1: { restrictions: [{ cred_def_id: credDefId }] },
      },
      requested_predicates: {},
    },
  },
})

describe('AutoCredentialMonitor', () => {
  let agent: ReturnType<typeof createMockAgent>
  let attestationMonitor: { start: jest.Mock; stop: jest.Mock }
  let emitSpy: jest.SpyInstance

  const buildMonitor = (rule = buildRule()) => {
    const monitor = new AutoCredentialMonitor(new MockLogger(), {
      rules: [rule],
      attestationMonitor,
    })
    monitor.start(agent as any)
    return { monitor, rule }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    agent = createMockAgent()
    attestationMonitor = { start: jest.fn(), stop: jest.fn() }
    emitSpy = jest.spyOn(DeviceEventEmitter, 'emit').mockImplementation(() => true)
  })

  afterEach(() => {
    emitSpy.mockRestore()
  })

  describe('handleProofStateChanged', () => {
    it('ignores proof state changes that are not RequestReceived', async () => {
      buildMonitor()
      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'p1', state: DidCommProofState.PresentationSent },
      })
      expect(agent.didcomm.proofs.getFormatData).not.toHaveBeenCalled()
    })

    it('does not trigger a workflow when the proof does not match any rule', async () => {
      const { monitor, rule } = buildMonitor()
      agent.didcomm.proofs.getFormatData.mockResolvedValue(proofFormat('unrelated:cred:def'))

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'p1', state: DidCommProofState.RequestReceived },
      })

      expect(rule.getInvitationUrl).not.toHaveBeenCalled()
      expect(monitor.workflowInProgress).toBe(false)
    })

    it('does not trigger a workflow when the matching credential is already in the wallet', async () => {
      const { monitor, rule } = buildMonitor()
      agent.didcomm.proofs.getFormatData.mockResolvedValue(proofFormat(TRIGGER_CRED_DEF_ID))
      mockedCredentialsMatchForProof.mockResolvedValue({
        proofFormats: { anoncreds: { attributes: { group1: [{ credentialId: 'c-1' }] }, predicates: {} } },
      })

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'p1', state: DidCommProofState.RequestReceived },
      })

      expect(rule.getInvitationUrl).not.toHaveBeenCalled()
      expect(monitor.workflowInProgress).toBe(false)
    })

    it('ignores further proof requests once a workflow is already in progress', async () => {
      agent.didcomm.oob.parseInvitation.mockResolvedValue({ id: 'inv-1' })
      agent.didcomm.oob.receiveInvitation.mockResolvedValue({ connectionRecord: { id: 'conn-1' } })
      agent.didcomm.proofs.getFormatData.mockResolvedValue(proofFormat(TRIGGER_CRED_DEF_ID))
      mockedCredentialsMatchForProof.mockResolvedValue({
        proofFormats: { anoncreds: { attributes: {}, predicates: {} } },
      })

      const { monitor } = buildMonitor()

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'p1', state: DidCommProofState.RequestReceived },
      })
      expect(monitor.workflowInProgress).toBe(true)

      agent.didcomm.proofs.getFormatData.mockClear()
      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'p2', state: DidCommProofState.RequestReceived },
      })
      expect(agent.didcomm.proofs.getFormatData).not.toHaveBeenCalled()
    })
  })

  describe('runWorkflow', () => {
    beforeEach(() => {
      agent.didcomm.oob.parseInvitation.mockResolvedValue({ id: 'inv-1' })
      agent.didcomm.oob.receiveInvitation.mockResolvedValue({ connectionRecord: { id: 'conn-1' } })
      agent.didcomm.proofs.getFormatData.mockResolvedValue(proofFormat(TRIGGER_CRED_DEF_ID))
      mockedCredentialsMatchForProof.mockResolvedValue({
        proofFormats: { anoncreds: { attributes: {}, predicates: {} } },
      })
    })

    const triggerWorkflow = async () =>
      agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'trigger-proof', state: DidCommProofState.RequestReceived },
      })

    it('stops AttestationMonitor and receives the invitation from the rule', async () => {
      const { rule } = buildMonitor()

      await triggerWorkflow()

      expect(attestationMonitor.stop).toHaveBeenCalledTimes(1)
      expect(rule.getInvitationUrl).toHaveBeenCalled()
      expect(agent.didcomm.oob.parseInvitation).toHaveBeenCalledWith('https://issuer.example?c_i=abc')
      expect(agent.didcomm.oob.receiveInvitation).toHaveBeenCalledWith(
        { id: 'inv-1' },
        { label: 'Person Credential Issuer' }
      )
      expect(emitSpy).toHaveBeenCalledWith(CredentialProvisioningEventTypes.Started)
    })

    it('declines issuer proof requests that arrive on the new connection', async () => {
      buildMonitor()
      await triggerWorkflow()

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'issuer-proof', state: DidCommProofState.RequestReceived, connectionId: 'conn-1' },
      })

      expect(agent.didcomm.proofs.declineRequest).toHaveBeenCalledWith({
        proofExchangeRecordId: 'issuer-proof',
        sendProblemReport: true,
      })
    })

    it('ignores issuer proof requests on unrelated connections', async () => {
      buildMonitor()
      await triggerWorkflow()

      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'stray', state: DidCommProofState.RequestReceived, connectionId: 'some-other-conn' },
      })

      expect(agent.didcomm.proofs.declineRequest).not.toHaveBeenCalled()
    })

    it('auto-accepts the credential offer on the workflow connection', async () => {
      buildMonitor()
      await triggerWorkflow()

      await agent.emit(DidCommCredentialEventTypes.DidCommCredentialStateChanged, {
        credentialExchangeRecord: {
          id: 'offer-1',
          state: DidCommCredentialState.OfferReceived,
          connectionId: 'conn-1',
        },
      })

      expect(agent.didcomm.credentials.acceptOffer).toHaveBeenCalledWith({ credentialExchangeRecordId: 'offer-1' })
    })

    it('does not accept the offer when the rule opts out via autoAcceptCredentialOffer:false', async () => {
      buildMonitor(buildRule({ autoAcceptCredentialOffer: false }))
      await triggerWorkflow()

      await agent.emit(DidCommCredentialEventTypes.DidCommCredentialStateChanged, {
        credentialExchangeRecord: {
          id: 'offer-1',
          state: DidCommCredentialState.OfferReceived,
          connectionId: 'conn-1',
        },
      })

      expect(agent.didcomm.credentials.acceptOffer).not.toHaveBeenCalled()
    })

    it('emits Completed and restarts AttestationMonitor when the credential reaches Done', async () => {
      const { monitor } = buildMonitor()
      await triggerWorkflow()

      await agent.emit(DidCommCredentialEventTypes.DidCommCredentialStateChanged, {
        credentialExchangeRecord: { id: 'cred-1', state: DidCommCredentialState.Done, connectionId: 'conn-1' },
      })

      expect(emitSpy).toHaveBeenCalledWith(CredentialProvisioningEventTypes.Completed)
      expect(attestationMonitor.start).toHaveBeenCalledTimes(1)
      expect(monitor.workflowInProgress).toBe(false)
    })

    it('emits FailedRequestCredential and restarts AttestationMonitor when getInvitationUrl throws', async () => {
      const failingRule = buildRule({
        getInvitationUrl: jest.fn().mockRejectedValue(new Error('issuer unavailable')),
      })
      const { monitor } = buildMonitor(failingRule)

      await triggerWorkflow()

      expect(emitSpy).toHaveBeenCalledWith(CredentialProvisioningEventTypes.FailedRequestCredential, expect.any(Error))
      expect(attestationMonitor.start).toHaveBeenCalledTimes(1)
      expect(monitor.workflowInProgress).toBe(false)
    })
  })

  describe('stop', () => {
    it('tears down workflow subscriptions and resets in-flight workflow state', async () => {
      agent.didcomm.oob.parseInvitation.mockResolvedValue({ id: 'inv-1' })
      agent.didcomm.oob.receiveInvitation.mockResolvedValue({ connectionRecord: { id: 'conn-1' } })
      agent.didcomm.proofs.getFormatData.mockResolvedValue(proofFormat(TRIGGER_CRED_DEF_ID))
      mockedCredentialsMatchForProof.mockResolvedValue({
        proofFormats: { anoncreds: { attributes: {}, predicates: {} } },
      })

      const { monitor } = buildMonitor()
      await agent.emit(DidCommProofEventTypes.ProofStateChanged, {
        proofRecord: { id: 'trigger-proof', state: DidCommProofState.RequestReceived },
      })
      expect(monitor.workflowInProgress).toBe(true)

      monitor.stop()
      expect(monitor.workflowInProgress).toBe(false)

      // After stop, credential offers on the workflow connection should no longer trigger acceptOffer.
      await agent.emit(DidCommCredentialEventTypes.DidCommCredentialStateChanged, {
        credentialExchangeRecord: {
          id: 'late-offer',
          state: DidCommCredentialState.OfferReceived,
          connectionId: 'conn-1',
        },
      })
      expect(agent.didcomm.credentials.acceptOffer).not.toHaveBeenCalled()
    })
  })
})
