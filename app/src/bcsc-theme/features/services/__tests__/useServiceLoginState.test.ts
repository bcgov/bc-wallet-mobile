import { renderHook, waitFor } from '@testing-library/react-native'

import { useServiceLoginState } from '../hooks/useServiceLoginState'

const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }

let mockData: any[] | undefined
let mockIsLoading = false
let mockLoad = jest.fn()
const mockUseDataLoader = jest.fn()

jest.mock('../hooks/useServiceLoginState', () => {
  const actual = jest.requireActual('../hooks/useServiceLoginState')
  return {
    ...actual,
  }
})

jest.mock('@/bcsc-theme/hooks/useDataLoader', () => ({
  __esModule: true,
  default: (...args: any[]) => mockUseDataLoader(...args),
}))

let mockHasPendingDeepLink = false
const mockConsumePending = jest.fn()

jest.mock('../../deep-linking', () => ({
  useDeepLinkViewModel: jest.fn(() => ({
    get hasPendingDeepLink() {
      return mockHasPendingDeepLink
    },
    consumePendingDeepLink: mockConsumePending,
  })),
}))

describe('useServiceLoginState', () => {
  beforeEach(() => {
    mockData = []
    mockIsLoading = false
    mockLoad = jest.fn()
    mockHasPendingDeepLink = false
    mockConsumePending.mockReset()
    logger.info.mockReset()
    logger.debug.mockReset()
    logger.error.mockReset()

    mockUseDataLoader.mockImplementation(() => ({
      data: mockData,
      load: mockLoad,
      isLoading: mockIsLoading,
    }))
  })

  it('seeds state from route params without loading metadata', () => {
    const metadata = { getClientMetadata: jest.fn() }

    const { result } = renderHook(() =>
      useServiceLoginState({
        serviceClientId: undefined,
        serviceTitle: 'Example Service',
        pairingCode: 'PAIR-123',
        metadata,
        logger,
      })
    )

    expect(result.current.state.serviceTitle).toBe('Example Service')
    expect(result.current.state.pairingCode).toBe('PAIR-123')
    expect(result.current.serviceHydrated).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(metadata.getClientMetadata).not.toHaveBeenCalled()
  })

  it('invokes loader on mount', () => {
    const metadata = { getClientMetadata: jest.fn() }

    renderHook(() =>
      useServiceLoginState({
        serviceClientId: 'client-123',
        metadata,
        logger,
      })
    )

    expect(mockLoad).toHaveBeenCalledTimes(1)
  })

  it('hydrates service state when matching client is found by id', async () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockData = [
      {
        client_ref_id: 'client-123',
        client_name: 'Health Connect',
        claims_description: 'Claims',
        policy_uri: 'https://policy',
        initiate_login_uri: 'https://login',
        client_uri: 'https://client',
      },
    ]

    const { result } = renderHook(() =>
      useServiceLoginState({
        serviceClientId: 'client-123',
        metadata,
        logger,
      })
    )

    await waitFor(() => expect(result.current.state.service?.client_ref_id).toBe('client-123'))

    expect(result.current.state.serviceTitle).toBe('Health Connect')
    expect(result.current.state.claimsDescription).toBe('Claims')
    expect(result.current.state.privacyPolicyUri).toBe('https://policy')
    expect(result.current.state.serviceInitiateLoginUri).toBe('https://login')
    expect(result.current.state.serviceClientUri).toBe('https://client')
    expect(result.current.serviceHydrated).toBe(true)
  })

  it('hydrates service when matching by title substring', async () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockData = [
      {
        client_ref_id: 'C57180A0-E6EC-2775-E054-00144FF962A2',
        client_name: 'BC Services Card Account',
        claims_description: 'The service will receive a unique number that represents you.',
        policy_uri: 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-services-card/privacy',
        initiate_login_uri: 'https://idsit.gov.bc.ca/login/initiate',
        client_uri: 'https://idsit.gov.bc.ca/account/',
      },
    ]

    const { result } = renderHook(() =>
      useServiceLoginState({
        serviceTitle: 'services card',
        metadata,
        logger,
      })
    )

    await waitFor(() => expect(result.current.state.service?.client_ref_id).toBeDefined())
    expect(result.current.state.serviceTitle).toBe('BC Services Card Account')
    expect(result.current.state.serviceInitiateLoginUri).toBe('https://idsit.gov.bc.ca/login/initiate')
    expect(result.current.state.serviceClientUri).toBe('https://idsit.gov.bc.ca/account/')
    expect(result.current.serviceHydrated).toBe(true)
  })

  it('leaves state untouched when no matching client is found', async () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockData = [
      {
        client_ref_id: 'C57180A0-E7A4-2775-E054-00144FF962A2',
        client_name: 'FED19 Whoami',
        claims_description: 'The service will receive a unique number that represents you.',
        policy_uri: 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-services-card/privacy',
        initiate_login_uri: 'https://idsit.gov.bc.ca/login/initiate',
        client_uri: 'https://idsit.gov.bc.ca/static/html/cancelLandingDemoApp.html',
      },
    ]

    const { result } = renderHook(() =>
      useServiceLoginState({
        serviceTitle: 'Nonexistent',
        metadata,
        logger,
      })
    )

    await waitFor(() => expect(result.current.state.service).toBeUndefined())
    expect(result.current.serviceHydrated).toBe(false)
  })

  it('does not consume pending deep link when serviceClientId is present', () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockHasPendingDeepLink = true
    mockConsumePending.mockReturnValue({ serviceTitle: 'Pending', pairingCode: 'CODE' })

    const { result } = renderHook(() =>
      useServiceLoginState({
        serviceClientId: 'client-locked',
        metadata,
        logger,
      })
    )

    expect(mockConsumePending).not.toHaveBeenCalled()
    expect(result.current.state.pairingCode).toBeUndefined()
  })

  it('does not consume pending deep link when pairing code already present', () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockHasPendingDeepLink = true
    mockConsumePending.mockReturnValue({ serviceTitle: 'Pending', pairingCode: 'CODE' })

    const { result } = renderHook(() =>
      useServiceLoginState({
        pairingCode: 'EXISTING',
        metadata,
        logger,
      })
    )

    expect(mockConsumePending).not.toHaveBeenCalled()
    expect(result.current.state.pairingCode).toBe('EXISTING')
  })

  it('consumes pending deep link when no service or pairing data exists', async () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockHasPendingDeepLink = true
    mockConsumePending.mockReturnValue({ serviceTitle: 'Pending Service', pairingCode: 'PAIR-999' })

    const { result } = renderHook(() =>
      useServiceLoginState({
        metadata,
        logger,
      })
    )

    await waitFor(() => expect(result.current.state.pairingCode).toBe('PAIR-999'))
    expect(result.current.state.serviceTitle).toBe('Pending Service')
    expect(mockConsumePending).toHaveBeenCalledTimes(1)
  })

  it('ignores pending deep link when consume returns null', async () => {
    const metadata = { getClientMetadata: jest.fn() }
    mockHasPendingDeepLink = true
    mockConsumePending.mockReturnValue(null)

    const { result } = renderHook(() =>
      useServiceLoginState({
        metadata,
        logger,
      })
    )

    await waitFor(() => expect(result.current.state.pairingCode).toBeUndefined())
    expect(mockConsumePending).toHaveBeenCalledTimes(1)
    expect(result.current.serviceHydrated).toBe(false)
  })
})
