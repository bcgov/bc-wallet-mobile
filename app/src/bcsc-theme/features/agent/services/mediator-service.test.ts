import { JsonEncoder } from '@credo-ts/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import { mediatorHost, mediatorLabel, switchMediator } from './mediator-service'

const MEDIATOR_URL = 'https://mediator.example/invite?oob=abc'
const TARGET = { mediatorUrl: MEDIATOR_URL, label: 'BC Wallet' }
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as never

type Connection = { id: string; isReady: boolean }
type Mediation = { id: string; connectionId: string }

const makeAgent = (
  overrides: {
    existingConnection?: Connection | null
    previousMediation?: Mediation | null
    /** The invitation was received before but never produced a connection. */
    orphanInvitation?: boolean
  } = {}
) => {
  const invitation = { id: 'inv-1' }
  const mediation = { id: 'med-1', connectionId: 'conn-1' }
  const readyConnection = { id: 'conn-1', isReady: true }
  const existingConnection = overrides.existingConnection === undefined ? readyConnection : overrides.existingConnection
  const previousMediation =
    overrides.previousMediation === undefined ? { id: 'med-0', connectionId: 'conn-0' } : overrides.previousMediation
  const outOfBandRecord = existingConnection || overrides.orphanInvitation ? { id: 'oob-1' } : null

  const agent = {
    didcomm: {
      oob: {
        parseInvitation: jest.fn().mockResolvedValue(invitation),
        findByReceivedInvitationId: jest.fn().mockResolvedValue(outOfBandRecord),
        receiveInvitation: jest.fn().mockResolvedValue({ connectionRecord: { id: 'conn-1', isReady: false } }),
        deleteById: jest.fn().mockResolvedValue(undefined),
      },
      connections: {
        findAllByOutOfBandId: jest.fn().mockResolvedValue(existingConnection ? [existingConnection] : []),
        returnWhenIsConnected: jest.fn().mockResolvedValue(readyConnection),
        deleteById: jest.fn().mockResolvedValue(undefined),
      },
      mediationRecipient: {
        findDefaultMediator: jest.fn().mockResolvedValue(previousMediation),
        getRouting: jest.fn().mockResolvedValue({ endpoints: [] }),
        provision: jest.fn().mockResolvedValue(mediation),
        setDefaultMediator: jest.fn().mockResolvedValue(undefined),
        stopMessagePickup: jest.fn().mockResolvedValue(undefined),
        initiateMessagePickup: jest.fn().mockResolvedValue(undefined),
      },
    },
  }

  return { agent: agent as never, api: agent.didcomm, mediation, previousMediation, readyConnection }
}

const callOrder = (fn: jest.Mock) => fn.mock.invocationCallOrder[0]
/** Lets a switch run up to its next pending await without relying on timers. */
const flush = async () => {
  for (let i = 0; i < 50; i++) {
    await Promise.resolve()
  }
}

describe('mediatorLabel', () => {
  const invitation = {
    '@type': 'https://didcomm.org/out-of-band/1.1/invitation',
    '@id': '4a66f8de-3791-40bd-8123-29d2b34a787b',
    label: 'BC Mediator (Test)',
    handshake_protocols: ['https://didcomm.org/didexchange/1.1'],
    services: ['did:sov:LjgpST2rjsoxYegQDRm7EL'],
  }
  const base64Url = (json: unknown) =>
    JsonEncoder.toBase64(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  it("uses the invitation's label", () => {
    expect(mediatorLabel(`https://mediator.example/invite?oob=${base64Url(invitation)}`)).toBe('BC Mediator (Test)')
  })

  it('falls back to the host when the URL carries no readable invitation', () => {
    expect(mediatorLabel(MEDIATOR_URL)).toBe('https://mediator.example/invite')
    expect(mediatorLabel('https://mediator.example')).toBe('https://mediator.example')
  })
})

describe('mediatorHost', () => {
  it('drops the invitation payload', () => {
    expect(mediatorHost(MEDIATOR_URL)).toBe('https://mediator.example/invite')
    expect(mediatorHost('https://mediator.example')).toBe('https://mediator.example')
  })
})

describe('switchMediator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('re-selects a mediator used before and moves message pickup to it', async () => {
    const { agent, api, mediation, readyConnection } = makeAgent()

    await expect(switchMediator(agent, TARGET, logger)).resolves.toBe(mediation)

    expect(api.oob.receiveInvitation).not.toHaveBeenCalled()
    expect(api.oob.deleteById).not.toHaveBeenCalled()
    expect(api.mediationRecipient.provision).toHaveBeenCalledWith(readyConnection)
    expect(api.mediationRecipient.setDefaultMediator).toHaveBeenCalledWith(mediation)
    expect(api.mediationRecipient.stopMessagePickup).toHaveBeenCalled()
    expect(api.mediationRecipient.initiateMessagePickup).toHaveBeenCalledWith(
      mediation,
      DidCommMediatorPickupStrategy.PickUpV2LiveMode
    )
  })

  it('connects to a new mediator directly under the wallet label and waits for the connection', async () => {
    const { agent, api, readyConnection } = makeAgent({ existingConnection: null })

    await switchMediator(agent, TARGET, logger)

    expect(api.mediationRecipient.getRouting).toHaveBeenCalledWith({ useDefaultMediator: false })
    expect(api.oob.receiveInvitation).toHaveBeenCalledWith(
      { id: 'inv-1' },
      expect.objectContaining({ label: 'BC Wallet', routing: { endpoints: [] }, autoAcceptConnection: true })
    )
    expect(api.connections.returnWhenIsConnected).toHaveBeenCalledWith('conn-1')
    expect(api.mediationRecipient.provision).toHaveBeenCalledWith(readyConnection)
    expect(api.connections.deleteById).not.toHaveBeenCalled()
    expect(api.oob.deleteById).not.toHaveBeenCalled()
  })

  it('discards a connection that never completed and connects to the mediator again', async () => {
    const { agent, api, readyConnection } = makeAgent({ existingConnection: { id: 'conn-stale', isReady: false } })

    await switchMediator(agent, TARGET, logger)

    expect(api.connections.deleteById).toHaveBeenCalledWith('conn-stale')
    expect(api.oob.deleteById).toHaveBeenCalledWith('oob-1')
    expect(callOrder(api.connections.deleteById)).toBeLessThan(callOrder(api.oob.deleteById))
    expect(callOrder(api.oob.deleteById)).toBeLessThan(callOrder(api.oob.receiveInvitation))
    expect(api.oob.receiveInvitation).toHaveBeenCalledWith(
      { id: 'inv-1' },
      expect.objectContaining({ label: 'BC Wallet' })
    )
    expect(api.connections.returnWhenIsConnected).toHaveBeenCalledWith('conn-1')
    expect(api.mediationRecipient.provision).toHaveBeenCalledWith(readyConnection)
  })

  it('discards a received invitation that produced no connection before connecting again', async () => {
    const { agent, api } = makeAgent({ existingConnection: null, orphanInvitation: true })

    await switchMediator(agent, TARGET, logger)

    expect(api.connections.deleteById).not.toHaveBeenCalled()
    expect(api.oob.deleteById).toHaveBeenCalledWith('oob-1')
    expect(callOrder(api.oob.deleteById)).toBeLessThan(callOrder(api.oob.receiveInvitation))
    expect(api.oob.receiveInvitation).toHaveBeenCalledTimes(1)
  })

  it('runs switches one after another, so a retry cannot discard the connection a switch is completing', async () => {
    const { agent, api, mediation, readyConnection } = makeAgent({ existingConnection: null })
    let connected!: (connection: Connection) => void
    api.connections.returnWhenIsConnected.mockImplementationOnce(
      () => new Promise<Connection>((resolve) => (connected = resolve))
    )

    const first = switchMediator(agent, TARGET, logger)
    await flush()
    expect(api.connections.returnWhenIsConnected).toHaveBeenCalledTimes(1)
    // What a retry would find while the first switch waits on its handshake
    api.oob.findByReceivedInvitationId.mockResolvedValue({ id: 'oob-1' })
    api.connections.findAllByOutOfBandId.mockResolvedValue([{ id: 'conn-1', isReady: false }])

    const second = switchMediator(agent, TARGET, logger)
    await flush()

    expect(api.oob.findByReceivedInvitationId).toHaveBeenCalledTimes(1)
    expect(api.connections.deleteById).not.toHaveBeenCalled()

    api.connections.findAllByOutOfBandId.mockResolvedValue([readyConnection])
    connected(readyConnection)
    await expect(first).resolves.toBe(mediation)
    await expect(second).resolves.toBe(mediation)

    expect(api.connections.deleteById).not.toHaveBeenCalled()
    expect(api.oob.deleteById).not.toHaveBeenCalled()
    expect(api.oob.receiveInvitation).toHaveBeenCalledTimes(1)
  })

  it('starts the next switch after a failed one', async () => {
    const { agent, api } = makeAgent({ existingConnection: null })
    api.oob.receiveInvitation.mockResolvedValueOnce({ connectionRecord: undefined })

    await expect(switchMediator(agent, TARGET, logger)).rejects.toThrow('no connection')
    await expect(switchMediator(agent, TARGET, logger)).resolves.toBeDefined()
  })

  it('fails before touching the default when the invitation yields no connection', async () => {
    const { agent, api } = makeAgent({ existingConnection: null })
    api.oob.receiveInvitation.mockResolvedValue({ connectionRecord: undefined })

    await expect(switchMediator(agent, TARGET, logger)).rejects.toThrow('no connection')

    expect(api.mediationRecipient.setDefaultMediator).not.toHaveBeenCalled()
  })

  it('tolerates having no message pickup to stop', async () => {
    const { agent, api } = makeAgent()
    api.mediationRecipient.stopMessagePickup.mockRejectedValue(new Error('no session'))

    await expect(switchMediator(agent, TARGET, logger)).resolves.toBeDefined()

    expect(api.mediationRecipient.initiateMessagePickup).toHaveBeenCalled()
  })

  it('puts the previous mediator back when pickup from the new one fails', async () => {
    const { agent, api, mediation, previousMediation } = makeAgent()
    api.mediationRecipient.initiateMessagePickup.mockRejectedValueOnce(new Error('live mode refused'))

    await expect(switchMediator(agent, TARGET, logger)).rejects.toThrow('live mode refused')

    expect(api.mediationRecipient.setDefaultMediator.mock.calls).toEqual([[mediation], [previousMediation]])
    expect(api.mediationRecipient.initiateMessagePickup).toHaveBeenLastCalledWith(
      previousMediation,
      DidCommMediatorPickupStrategy.PickUpV2LiveMode
    )
  })

  it('still reports the original failure when the previous mediator cannot be restored', async () => {
    const { agent, api } = makeAgent()
    api.mediationRecipient.initiateMessagePickup.mockRejectedValue(new Error('live mode refused'))

    await expect(switchMediator(agent, TARGET, logger)).rejects.toThrow('live mode refused')

    expect(api.mediationRecipient.setDefaultMediator).toHaveBeenCalledTimes(2)
  })

  it('leaves the new mediator in place when there was none to restore', async () => {
    const { agent, api, mediation } = makeAgent({ previousMediation: null })
    api.mediationRecipient.initiateMessagePickup.mockRejectedValueOnce(new Error('live mode refused'))

    await expect(switchMediator(agent, TARGET, logger)).rejects.toThrow('live mode refused')

    expect(api.mediationRecipient.setDefaultMediator.mock.calls).toEqual([[mediation]])
  })
})
