import { renderHook } from '@testing-library/react-native'
import { useCreateSystemChecks } from './useCreateSystemChecks'
import { SystemCheckScope } from './useSystemChecks'

// --------------------
// Mock functions
// --------------------
export const useTranslationMock = jest.fn()
export const useStoreMock = jest.fn()
export const useServicesMock = jest.fn()
export const useBCSCApiClientStateMock = jest.fn()
export const useTokenApiMock = jest.fn()
export const useConfigApiMock = jest.fn()
export const useRegistrationApiMock = jest.fn()
export const useNavigationMock = jest.fn()
export const useNavigationContainerMock = jest.fn()
export const getBundleIdMock = jest.fn()

export const AnalyticsSystemCheckMock = jest.fn()
export const ServerStatusSystemCheckMock = jest.fn()
export const UpdateAppSystemCheckMock = jest.fn()
export const DeviceInvalidatedSystemCheckMock = jest.fn()
export const DeviceCountSystemCheckMock = jest.fn()
export const AccountExpiryWarningBannerSystemCheckMock = jest.fn()
export const UpdateDeviceRegistrationSystemCheckMock = jest.fn()

// --------------------
// External hooks
// --------------------
jest.mock('react-i18next', () => ({
  useTranslation: () => useTranslationMock(),
}))

jest.mock('@bifold/core', () => ({
  useStore: () => useStoreMock(),
  useServices: () => useServicesMock(),
  TOKENS: {
    UTIL_LOGGER: 'UTIL_LOGGER',
  },
}))

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClientState: () => useBCSCApiClientStateMock(),
}))

jest.mock('@/bcsc-theme/api/hooks/useTokens', () => () => useTokenApiMock())
jest.mock('../api/hooks/useConfigApi', () => () => useConfigApiMock())
jest.mock('../api/hooks/useRegistrationApi', () => () => useRegistrationApiMock())

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => useNavigationMock(),
}))

jest.mock('@/contexts/NavigationContainerContext', () => ({
  useNavigationContainer: () => useNavigationContainerMock(),
}))

jest.mock('react-native-device-info', () => ({
  getBundleId: () => getBundleIdMock(),
}))

// --------------------
// System checks
// --------------------
jest.mock('@/services/system-checks/AnalyticsSystemCheck', () => ({
  AnalyticsSystemCheck: AnalyticsSystemCheckMock,
}))

jest.mock('@/services/system-checks/ServerStatusSystemCheck', () => ({
  ServerStatusSystemCheck: ServerStatusSystemCheckMock,
}))

jest.mock('@/services/system-checks/UpdateAppSystemCheck', () => ({
  UpdateAppSystemCheck: UpdateAppSystemCheckMock,
}))

jest.mock('@/services/system-checks/DeviceInvalidatedSystemCheck', () => ({
  DeviceInvalidatedSystemCheck: DeviceInvalidatedSystemCheckMock,
}))

jest.mock('@/services/system-checks/DeviceCountSystemCheck', () => ({
  DeviceCountSystemCheck: DeviceCountSystemCheckMock,
}))

jest.mock('@/services/system-checks/AccountExpiryWarningBannerSystemCheck', () => ({
  AccountExpiryWarningBannerSystemCheck: AccountExpiryWarningBannerSystemCheckMock,
}))

jest.mock('@/services/system-checks/UpdateDeviceRegistrationSystemCheck', () => ({
  UpdateDeviceRegistrationSystemCheck: UpdateDeviceRegistrationSystemCheckMock,
}))

describe('useGetSystemChecks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('STARTUP scope', () => {
    describe('readiness', () => {
      it('should be ready when navigation is ready, client exists, and client is ready', () => {
        useStoreMock.mockReturnValue([
          {
            stateLoaded: true,
            bcsc: {
              analyticsOptIn: true,
            },
            bcscSecure: {
              isHydrated: true,
            },
          },
          jest.fn(),
        ])
        useTranslationMock.mockReturnValue({ t: jest.fn() })

        useServicesMock.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])

        useBCSCApiClientStateMock.mockReturnValue({ client: {}, isClientReady: true })

        useNavigationContainerMock.mockReturnValue({ isNavigationReady: true })

        getBundleIdMock.mockReturnValue('ca.bc.gov.id.servicescard')

        const { result } = renderHook(() => useCreateSystemChecks())

        expect(result.current[SystemCheckScope.STARTUP].isReady).toBe(true)
      })
    })
  })
})
