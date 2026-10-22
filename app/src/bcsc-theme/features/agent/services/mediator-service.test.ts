import { JsonEncoder } from '@credo-ts/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import { mediatorHost, mediatorLabel, switchMediator } from './mediator-service'

const MEDIATOR_URL = 'https://mediator.example/invite?oob=abc'
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as never

type Connection = { id: string; isReady: boolean }
type Mediation = { id: string; connectionId: string }

const makeAgent = (
  overrides: { existingConnection?: Connection | null; previousMediation?: Mediation | null } = {}
) => {
  const invitation = { id: 'inv-1' }
  const mediation = { id: 'med-1', connectionId: 'conn-1' }
  const readyConnection = { id: 'conn-1', isReady: true }
  const existingConnection = overrides.existingConnection === undefined ? readyConnection : overrides.existingConnection
  const previousMediation =
    overrides.previousMediation === undefined ? { id: 'med-0', connectionId: 'conn-0' } : overrides.previousMediation

  const agent = {
    didcomm: {
      oob: {
        parseInvitation: jest.fn().mockResolvedValue(invitation),
        findByReceivedInvitationId: jest.fn().mockResolvedValue(existingConnection ? { id: 'oob-1' } : null),
        receiveInvitation: jest.fn().mockResolvedValue({ connectionRecord: { id: 'conn-1', isReady: false } }),
      },
      connections: {
        findAllByOutOfBandId: jest.fn().mockResolvedValue(existingConnection ? [existingConnection] : []),
        returnWhenIsConnected: jest.fn().mockResolvedValue(readyConnection),
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

    await expect(switchMediator(agent, MEDIATOR_URL, logger)).resolves.toBe(mediation)

    expect(api.oob.receiveInvitation).not.toHaveBeenCalled()
    expect(api.mediationRecipient.provision).toHaveBeenCalledWith(readyConnection)
    expect(api.mediationRecipient.setDefaultMediator).toHaveBeenCalledWith(mediation)
    expect(api.mediationRecipient.stopMessagePickup).toHaveBeenCalled()
    expect(api.mediationRecipient.initiateMessagePickup).toHaveBeenCalledWith(
      mediation,
      DidCommMediatorPickupStrategy.PickUpV2LiveMode
    )
  })

  it('connects to a new mediator directly and waits for the connection', async () => {
    const { agent, api, readyConnection } = makeAgent({ existingConnection: null })

    await switchMediator(agent, MEDIATOR_URL, logger)

    expect(api.mediationRecipient.getRouting).toHaveBeenCalledWith({ useDefaultMediator: false })
    expect(api.oob.receiveInvitation).toHaveBeenCalledWith(
      { id: 'inv-1' },
      expect.objectContaining({ routing: { endpoints: [] }, autoAcceptConnection: true })
    )
    expect(api.connections.returnWhenIsConnected).toHaveBeenCalledWith('conn-1')
    expect(api.mediationRecipient.provision).toHaveBeenCalledWith(readyConnection)
  })

  it('waits for a known connection that is not ready yet', async () => {
    const { agent, api, readyConnection } = makeAgent({ existingConnection: { id: 'conn-1', isReady: false } })

    await switchMediator(agent, MEDIATOR_URL, logger)

    expect(api.connections.returnWhenIsConnected).toHaveBeenCalledWith('conn-1')
    expect(api.mediationRecipient.provision).toHaveBeenCalledWith(readyConnection)
  })

  it('fails before touching the default when the invitation yields no connection', async () => {
    const { agent, api } = makeAgent({ existingConnection: null })
    api.oob.receiveInvitation.mockResolvedValue({ connectionRecord: undefined })

    await expect(switchMediator(agent, MEDIATOR_URL, logger)).rejects.toThrow('no connection')

    expect(api.mediationRecipient.setDefaultMediator).not.toHaveBeenCalled()
  })

  it('tolerates having no message pickup to stop', async () => {
    const { agent, api } = makeAgent()
    api.mediationRecipient.stopMessagePickup.mockRejectedValue(new Error('no session'))

    await expect(switchMediator(agent, MEDIATOR_URL, logger)).resolves.toBeDefined()

    expect(api.mediationRecipient.initiateMessagePickup).toHaveBeenCalled()
  })

  it('puts the previous mediator back when pickup from the new one fails', async () => {
    const { agent, api, mediation, previousMediation } = makeAgent()
    api.mediationRecipient.initiateMessagePickup.mockRejectedValueOnce(new Error('live mode refused'))

    await expect(switchMediator(agent, MEDIATOR_URL, logger)).rejects.toThrow('live mode refused')

    expect(api.mediationRecipient.setDefaultMediator.mock.calls).toEqual([[mediation], [previousMediation]])
    expect(api.mediationRecipient.initiateMessagePickup).toHaveBeenLastCalledWith(
      previousMediation,
      DidCommMediatorPickupStrategy.PickUpV2LiveMode
    )
  })

  it('still reports the original failure when the previous mediator cannot be restored', async () => {
    const { agent, api } = makeAgent()
    api.mediationRecipient.initiateMessagePickup.mockRejectedValue(new Error('live mode refused'))

    await expect(switchMediator(agent, MEDIATOR_URL, logger)).rejects.toThrow('live mode refused')

    expect(api.mediationRecipient.setDefaultMediator).toHaveBeenCalledTimes(2)
  })

  it('leaves the new mediator in place when there was none to restore', async () => {
    const { agent, api, mediation } = makeAgent({ previousMediation: null })
    api.mediationRecipient.initiateMessagePickup.mockRejectedValueOnce(new Error('live mode refused'))

    await expect(switchMediator(agent, MEDIATOR_URL, logger)).rejects.toThrow('live mode refused')

    expect(api.mediationRecipient.setDefaultMediator.mock.calls).toEqual([[mediation]])
  })
})
