import { renderHook } from '@testing-library/react-native'

import { useServiceLoginState } from '../hooks/useServiceLoginState'

jest.mock('../hooks/useServiceLoginState', () => {
  const actual = jest.requireActual('../hooks/useServiceLoginState')
  return {
    ...actual,
  }
})

jest.mock('@/bcsc-theme/hooks/useDataLoader', () => {
  return jest.fn().mockImplementation(() => ({
    data: [],
    load: jest.fn(),
    isLoading: false,
  }))
})

jest.mock('../../deep-linking', () => ({
  useDeepLinkViewModel: jest.fn().mockReturnValue({
    hasPendingDeepLink: false,
    consumePendingDeepLink: jest.fn(),
  }),
}))

describe('useServiceLoginState', () => {
  it('seeds state from route params without loading metadata', () => {
    const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
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
})
