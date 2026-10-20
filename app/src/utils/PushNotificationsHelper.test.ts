import { DidCommConnectionType } from '@credo-ts/didcomm'
import { isMediatorCapable } from './PushNotificationsHelper'

jest.mock('react-native-config', () => ({ Config: { MEDIATOR_USE_PUSH_NOTIFICATIONS: 'true' } }))

const mediatorConnection = (id: string, updatedAt: string) => ({
  id,
  connectionTypes: [DidCommConnectionType.Mediator],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date(updatedAt),
})

const makeAgent = (defaultMediatorConnection: unknown, connections: unknown[]) => {
  const queryFeatures = jest.fn().mockResolvedValue({ features: [{ id: 'push-notifications-fcm' }] })
  const agent = {
    config: { logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
    didcomm: {
      mediationRecipient: { findDefaultMediatorConnection: jest.fn().mockResolvedValue(defaultMediatorConnection) },
      connections: { getAll: jest.fn().mockResolvedValue(connections) },
      discovery: { queryFeatures },
    },
  }
  return { agent: agent as never, queryFeatures }
}

describe('isMediatorCapable', () => {
  it('asks the default mediator, even when another mediator connection is newer', async () => {
    const defaultConnection = mediatorConnection('default', '2026-01-02T00:00:00Z')
    const { agent, queryFeatures } = makeAgent(defaultConnection, [
      defaultConnection,
      mediatorConnection('newer', '2026-01-03T00:00:00Z'),
    ])

    await expect(isMediatorCapable(agent)).resolves.toBe(true)

    expect(queryFeatures).toHaveBeenCalledWith(expect.objectContaining({ connectionId: 'default' }))
  })

  it('falls back to the most recently updated mediator connection without a default', async () => {
    const { agent, queryFeatures } = makeAgent(null, [
      mediatorConnection('older', '2026-01-02T00:00:00Z'),
      mediatorConnection('newer', '2026-01-03T00:00:00Z'),
    ])

    await expect(isMediatorCapable(agent)).resolves.toBe(true)

    expect(queryFeatures).toHaveBeenCalledWith(expect.objectContaining({ connectionId: 'newer' }))
  })

  it('cannot answer without any mediator connection', async () => {
    const { agent, queryFeatures } = makeAgent(null, [])

    await expect(isMediatorCapable(agent)).resolves.toBeUndefined()

    expect(queryFeatures).not.toHaveBeenCalled()
  })
})
