import { DeepLinkViewModel } from '../DeepLinkViewModel'
import { DeepLinkPayload } from '../services/deep-linking'

describe('DeepLinkViewModel', () => {
  const pairingPath = '/https%3A%2F%2Fexample.com%2Fdevice%2FMy+Service%2FPAIR123'

  let capturedHandler: ((payload: DeepLinkPayload) => void) | undefined
  let mockService: { subscribe: jest.Mock; init: jest.Mock }
  let mockPairingService: { handlePairing: jest.Mock }
  let logger: { info: jest.Mock; warn: jest.Mock }

  const buildPayload = (path: string = pairingPath, host: string = 'pair'): DeepLinkPayload => ({
    rawUrl: `ca.bc.gov.iddev.servicescard://${host}${path}`,
    host,
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
    mockPairingService = {
      handlePairing: jest.fn(),
    }
  })

  it('initializes deep link service on initialize', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()

    expect(mockService.subscribe).toHaveBeenCalled()
    expect(mockService.init).toHaveBeenCalled()
  })

  it('delegates pairing deep link to PairingService', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()
    capturedHandler?.(buildPayload())

    expect(mockPairingService.handlePairing).toHaveBeenCalledWith({
      serviceTitle: 'My Service',
      pairingCode: 'PAIR123',
      source: 'deep-link',
    })
  })

  it('uses pre-parsed pairing metadata without re-decoding', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()

    capturedHandler?.({
      rawUrl: 'ca.bc.gov.iddev.servicescard://pair/ignored',
      host: 'pair',
      serviceTitle: 'Ready Title',
      pairingCode: 'READY',
    })

    expect(mockPairingService.handlePairing).toHaveBeenCalledWith({
      serviceTitle: 'Ready Title',
      pairingCode: 'READY',
      source: 'deep-link',
    })
  })

  it('parses pairing metadata when URL.pathname is unavailable', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()
    capturedHandler?.(buildPayload('/https%3A%2F%2Fidsit.gov.bc.ca%2Fdevice/BC+Parks+Discover+Camping/HHFBYS'))

    expect(mockPairingService.handlePairing).toHaveBeenCalledWith({
      serviceTitle: 'BC Parks Discover Camping',
      pairingCode: 'HHFBYS',
      source: 'deep-link',
    })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('logs a warning when pairing payload cannot be parsed', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()
    capturedHandler?.(buildPayload('/%'))

    expect(logger.warn).toHaveBeenCalled()
    expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
  })

  it('ignores deep links for other hosts', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()
    capturedHandler?.({ rawUrl: 'scheme://other/thing', host: 'other', path: '/thing' })

    expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
  })

  it('skips pairing payloads that do not match expected segments', () => {
    const viewModel = new DeepLinkViewModel(mockService as any, logger as any, mockPairingService as any)

    viewModel.initialize()
    capturedHandler?.(buildPayload('/https%3A%2F%2Fexample.com%2Ffoo'))

    expect(mockPairingService.handlePairing).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
