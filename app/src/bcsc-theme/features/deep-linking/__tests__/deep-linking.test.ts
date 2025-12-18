import { Linking } from 'react-native'
import { DeepLinkService } from '../services/deep-linking'

jest.mock('react-native', () => ({
  Linking: {
    getInitialURL: jest.fn(),
    addEventListener: jest.fn(),
  },
}))

const mockLinking = Linking as jest.Mocked<typeof Linking>
const stubSubscription = (handler: (event: { url: string }) => void) => ({
  remove: jest.fn(),
  emitter: null as any,
  listener: handler as any,
  context: null as any,
  eventType: 'url' as any,
  key: 1,
  subscriber: null as any,
})

const pairingUrl = 'ca.bc.gov.iddev.servicescard://pair/https%3A%2F%2Fexample.com%2Fdevice%2FMy+Service%2FCODE123'
const demoPairingUrl =
  'ca.bc.gov.id.servicescard.dev://pair/https%3A%2F%2Fidsit.gov.bc.ca%2Fdevice/BC+Parks+Discover+Camping/HHFBYS'

describe('DeepLinkService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLinking.getInitialURL.mockResolvedValue(null)
    mockLinking.addEventListener.mockImplementation((_event, handler) => stubSubscription(handler) as any)
  })

  it('emits initial URL and parses pairing metadata', async () => {
    const handler = jest.fn()
    mockLinking.getInitialURL.mockResolvedValue(pairingUrl)

    // Capture the handler provided to addEventListener so we can assert it exists
    let capturedListener: ((payload: { url: string }) => void) | undefined
    mockLinking.addEventListener.mockImplementation((_event, listener) => {
      capturedListener = listener as any
      return stubSubscription(listener as any) as any
    })

    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    expect(mockLinking.getInitialURL).toHaveBeenCalled()
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        rawUrl: pairingUrl,
        host: 'pair',
        path: '/https%3A%2F%2Fexample.com%2Fdevice%2FMy+Service%2FCODE123',
        serviceTitle: 'My Service',
        pairingCode: 'CODE123',
      }),
    )
    expect(mockLinking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function))
    expect(capturedListener).toBeDefined()
  })

  it('stops notifying after unsubscribe', async () => {
    let eventHandler: ((event: { url: string }) => void) | undefined
    mockLinking.addEventListener.mockImplementation((_event, listener) => {
      eventHandler = listener as any
      return stubSubscription(listener as any) as any
    })

    const handler = jest.fn()
    const service = new DeepLinkService()
    const unsubscribe = service.subscribe(handler)
    await service.init()

    eventHandler?.({ url: pairingUrl })
    expect(handler).toHaveBeenCalledTimes(1)

    unsubscribe()
    eventHandler?.({ url: pairingUrl })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('parses raw URL when URL constructor throws', async () => {
    let eventHandler: ((event: { url: string }) => void) | undefined
    mockLinking.addEventListener.mockImplementation((_event, listener) => {
      eventHandler = listener as any
      return stubSubscription(listener as any) as any
    })

    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    eventHandler?.({ url: 'not-a-url' })

    expect(handler).toHaveBeenCalledWith({ rawUrl: 'not-a-url' })
  })

  it('allows subscribing after init when an initial URL was captured', async () => {
    mockLinking.getInitialURL.mockResolvedValue(pairingUrl)
    const service = new DeepLinkService()
    await service.init()

    const handler = jest.fn()
    service.subscribe(handler)

    // No automatic replay exists, but the branch should be exercised and we can still emit manually
    const manualEmit = mockLinking.addEventListener.mock.calls[0]?.[1]
    manualEmit?.({ url: pairingUrl })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ serviceTitle: 'My Service', pairingCode: 'CODE123' }),
    )
  })

  it('clears handlers on destroy', async () => {
    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    service.destroy()

    const eventHandler = mockLinking.addEventListener.mock.calls[0]?.[1]
    eventHandler?.({ url: pairingUrl })

    expect(handler).not.toHaveBeenCalled()
  })

  it('parses custom scheme fallback and extracts pairing metadata', async () => {
    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    const eventHandler = mockLinking.addEventListener.mock.calls[0]?.[1]
    eventHandler?.({ url: demoPairingUrl })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        rawUrl: demoPairingUrl,
        host: 'pair',
        path: '/https%3A%2F%2Fidsit.gov.bc.ca%2Fdevice/BC+Parks+Discover+Camping/HHFBYS',
        serviceTitle: 'BC Parks Discover Camping',
        pairingCode: 'HHFBYS',
      }),
    )
  })

  it('returns rawUrl when custom scheme has no separator', async () => {
    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    const eventHandler = mockLinking.addEventListener.mock.calls[0]?.[1]
    eventHandler?.({ url: 'no-separator-here' })

    expect(handler).toHaveBeenCalledWith({ rawUrl: 'no-separator-here' })
  })

  it('returns rawUrl when custom scheme remainder is empty', async () => {
    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    const eventHandler = mockLinking.addEventListener.mock.calls[0]?.[1]
    eventHandler?.({ url: 'app://' })

    expect(handler).toHaveBeenCalledWith({ rawUrl: 'app://', host: '', path: '' })
  })

  it('returns base payload for non-pair hosts without pairing metadata', async () => {
    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    const eventHandler = mockLinking.addEventListener.mock.calls[0]?.[1]
    eventHandler?.({ url: 'myapp://other/path/segment' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ rawUrl: 'myapp://other/path/segment', host: 'other', path: '/path/segment' }),
    )
    expect(handler).toHaveBeenCalledWith(expect.not.objectContaining({ pairingCode: expect.any(String) }))
  })

  it('ignores pairing extraction when device segment is missing or too short', async () => {
    const handler = jest.fn()
    const service = new DeepLinkService()
    service.subscribe(handler)
    await service.init()

    const eventHandler = mockLinking.addEventListener.mock.calls[0]?.[1]
    eventHandler?.({ url: 'myapp://pair/https%3A%2F%2Fexample.com%2Fno-device%2Fonlyone' })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ rawUrl: 'myapp://pair/https%3A%2F%2Fexample.com%2Fno-device%2Fonlyone', host: 'pair' }),
    )
    expect(handler).toHaveBeenCalledWith(expect.not.objectContaining({ pairingCode: expect.any(String) }))
  })
})
