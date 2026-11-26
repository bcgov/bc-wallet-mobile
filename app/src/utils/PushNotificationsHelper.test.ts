import { PersistentStorage } from '@bifold/core'
import { DidCommConnectionType } from '@credo-ts/didcomm'
import { AuthorizationStatus, requestPermission as requestMessagingPermission } from '@react-native-firebase/messaging'
import { Platform } from 'react-native'
import { checkNotifications, requestNotifications, RESULTS } from 'react-native-permissions'
import { BCLocalStorageKeys } from '../store'
import { isMediatorCapable, NotificationPermissionStatus, setup } from './PushNotificationsHelper'

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

describe('setup', () => {
  const originalOS = Platform.OS
  const mockedCheck = checkNotifications as jest.Mock
  const mockedRequest = requestNotifications as jest.Mock
  const mockedMessagingRequest = requestMessagingPermission as jest.Mock
  let storeValue: jest.SpyInstance

  const answer = (status: string) => ({ status, settings: {} })

  beforeEach(() => {
    Platform.OS = 'android'
    storeValue = jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue(undefined)
    mockedCheck.mockResolvedValueOnce(answer(RESULTS.DENIED))
  })

  afterEach(() => {
    Platform.OS = originalOS
    jest.useRealTimers()
    jest.restoreAllMocks()
    mockedCheck.mockReset()
    mockedRequest.mockReset()
    mockedMessagingRequest.mockReset()
  })

  it('records the real answer however long the user takes', async () => {
    jest.useFakeTimers()
    let answerPrompt: (value: unknown) => void = () => undefined
    mockedRequest.mockReturnValueOnce(new Promise((resolve) => (answerPrompt = resolve)))
    let settled = false

    const result = setup().finally(() => {
      settled = true
    })
    await jest.advanceTimersByTimeAsync(5000)
    expect(settled).toBe(false)

    answerPrompt(answer(RESULTS.GRANTED))

    await expect(result).resolves.toBe(NotificationPermissionStatus.GRANTED)
  })

  it.each([
    [RESULTS.GRANTED, NotificationPermissionStatus.GRANTED],
    [RESULTS.DENIED, NotificationPermissionStatus.DENIED],
    [RESULTS.BLOCKED, NotificationPermissionStatus.BLOCKED],
    [RESULTS.UNAVAILABLE, NotificationPermissionStatus.UNKNOWN],
  ])('maps the OS answer %s to %s', async (osStatus, expected) => {
    mockedRequest.mockResolvedValueOnce(answer(osStatus))

    await expect(setup()).resolves.toBe(expected)
  })

  it('skips the prompt when permission is already granted', async () => {
    mockedCheck.mockReset()
    mockedCheck.mockResolvedValueOnce(answer(RESULTS.GRANTED))

    await expect(setup()).resolves.toBe(NotificationPermissionStatus.GRANTED)

    expect(mockedRequest).not.toHaveBeenCalled()
  })

  it('surfaces a failed request without marking the user as prompted', async () => {
    mockedRequest.mockRejectedValueOnce(new Error('request failed'))

    await expect(setup()).rejects.toThrow('request failed')

    expect(storeValue).not.toHaveBeenCalled()
  })

  it('marks the user as prompted once the request resolves', async () => {
    mockedRequest.mockResolvedValueOnce(answer(RESULTS.DENIED))

    await setup()

    expect(storeValue).toHaveBeenCalledWith(BCLocalStorageKeys.UserDeniedPushNotifications, true)
  })

  it.each([
    [AuthorizationStatus.AUTHORIZED, NotificationPermissionStatus.GRANTED],
    [AuthorizationStatus.DENIED, NotificationPermissionStatus.DENIED],
  ])('uses the Firebase prompt on iOS (%s -> %s)', async (firebaseStatus, expected) => {
    Platform.OS = 'ios'
    mockedMessagingRequest.mockResolvedValueOnce(firebaseStatus)

    await expect(setup()).resolves.toBe(expected)

    expect(mockedRequest).not.toHaveBeenCalled()
    expect(mockedCheck).not.toHaveBeenCalled()
  })
})
