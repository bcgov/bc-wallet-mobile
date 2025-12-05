import { DeepLinkViewModel } from '../DeepLinkViewModel'
import { DeepLinkPayload } from '../services/deep-linking'

describe('DeepLinkViewModel', () => {
  const pairingPath = '/https%3A%2F%2Fexample.com%2Fdevice%2FMy+Service%2FPAIR123'

  let capturedHandler: ((payload: DeepLinkPayload) => void) | undefined
  let mockService: { subscribe: jest.Mock; init: jest.Mock }
  let logger: { info: jest.Mock; warn: jest.Mock }

  const buildPayload = (path: string = pairingPath): DeepLinkPayload => ({
    rawUrl: `ca.bc.gov.iddev.servicescard://pair${path}`,
    host: 'pair',
    path,
  })

  beforeEach(() => {
    capturedHandler = undefined
    logger = { info: jest.fn(), warn: jest.fn() }
    mockService = {
      subscribe: jest.fn((handler: (payload: DeepLinkPayload) => void) => {
        capturedHandler = handler
        return () => undefined
      }),
      init: jest.fn(),
    }
  })

  it('buffers pairing deep link and notifies pending state when no navigation listeners registered', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const pendingStates: boolean[] = []

    viewModel.onPendingStateChange((hasPending) => pendingStates.push(hasPending))

    viewModel.initialize()

    expect(mockService.subscribe).toHaveBeenCalled()
    expect(mockService.init).toHaveBeenCalled()
    expect(pendingStates).toEqual([false])
    expect(capturedHandler).toBeDefined()

    const payload = buildPayload()

    capturedHandler?.(payload)

    expect(viewModel.hasPendingDeepLink).toBe(true)
    expect(pendingStates).toEqual([false, true])
    expect(viewModel.getPendingDeepLink()).toEqual(payload)
  })

  it('emits navigation immediately when a listener is registered', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const pendingStates: boolean[] = []
    const navEvents: any[] = []

    viewModel.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    viewModel.onNavigationRequest((event) => navEvents.push(event))

    viewModel.initialize()
    capturedHandler?.(buildPayload())

    expect(navEvents).toEqual([
      {
        screen: expect.stringContaining('ServiceLogin'),
        params: { serviceTitle: 'My Service', pairingCode: 'PAIR123' },
      },
    ])
    expect(viewModel.hasPendingDeepLink).toBe(false)
    expect(pendingStates).toEqual([false])
  })

  it('consumes and clears pending deep link state', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const pendingStates: boolean[] = []

    viewModel.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    viewModel.initialize()

    const payload = buildPayload()
    capturedHandler?.(payload)

    expect(viewModel.consumePendingDeepLink()).toEqual(payload)
    expect(viewModel.hasPendingDeepLink).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
  })

  it('returns null when consuming with no pending deep link', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const pendingStates: boolean[] = []

    viewModel.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    viewModel.initialize()

    expect(viewModel.consumePendingDeepLink()).toBeNull()
    expect(pendingStates).toEqual([false])
  })

  it('processes buffered deep link once navigation is ready', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const pendingStates: boolean[] = []
    const navEvents: any[] = []

    viewModel.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    viewModel.initialize()

    const payload = buildPayload()
    capturedHandler?.(payload)

    viewModel.onNavigationRequest((event) => navEvents.push(event))
    viewModel.processPendingDeepLink()

    expect(navEvents).toHaveLength(1)
    expect(navEvents[0]).toMatchObject({
      params: { serviceTitle: 'My Service', pairingCode: 'PAIR123' },
    })
    expect(viewModel.hasPendingDeepLink).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
  })

  it('clears pending state without processing', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const pendingStates: boolean[] = []

    viewModel.onPendingStateChange((hasPending) => pendingStates.push(hasPending))
    viewModel.initialize()

    capturedHandler?.(buildPayload())
    viewModel.clearPendingDeepLink()

    expect(viewModel.hasPendingDeepLink).toBe(false)
    expect(pendingStates).toEqual([false, true, false])
  })

  it('logs a warning when pairing payload cannot be parsed', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)

    viewModel.initialize()
    capturedHandler?.(buildPayload('/%'))

    expect(logger.warn).toHaveBeenCalled()
    expect(viewModel.hasPendingDeepLink).toBe(false)
  })

  it('ignores deep links for other hosts', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)
    const navEvents: any[] = []

    viewModel.onNavigationRequest((event) => navEvents.push(event))
    viewModel.initialize()

    capturedHandler?.({ rawUrl: 'scheme://other/thing', host: 'other', path: '/thing' })

    expect(navEvents).toHaveLength(0)
    expect(viewModel.hasPendingDeepLink).toBe(false)
  })

  it('skips pairing payloads that do not match expected segments', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any)

    viewModel.initialize()
    capturedHandler?.(buildPayload('/https%3A%2F%2Fexample.com%2Ffoo'))

    expect(viewModel.hasPendingDeepLink).toBe(false)
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
