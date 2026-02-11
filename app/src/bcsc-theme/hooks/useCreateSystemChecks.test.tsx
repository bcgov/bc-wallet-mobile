import { renderHook } from '@testing-library/react-native'
import React from 'react'
import * as DeviceInfo from 'react-native-device-info'
import { useCreateSystemChecks } from './useCreateSystemChecks'
import { SystemCheckScope } from './useSystemChecks'

// --------------------
// Mock functions
// --------------------
export const mockUseTranslation = jest.fn()
export const mockUseStore = jest.fn()
export const mockUseServices = jest.fn()
export const mockUseBCSCApiClientState = jest.fn()
export const mockUseTokenApi = jest.fn()
export const mockUseConfigApi = jest.fn()
export const mockUseRegistrationApi = jest.fn()
export const mockUseNavigation = jest.fn()
export const mockUseNavigationContainer = jest.fn()
export const mockGetBundleId = jest.fn()

// --------------------
// External hooks
// --------------------
jest.mock('@bifold/core', () => ({
  useStore: () => mockUseStore(),
  useServices: () => mockUseServices(),
  TOKENS: {
    UTIL_LOGGER: 'UTIL_LOGGER',
  },
}))

jest.mock('@/bcsc-theme/hooks/useBCSCApiClient', () => ({
  useBCSCApiClientState: () => mockUseBCSCApiClientState(),
}))

jest.mock('@/bcsc-theme/api/hooks/useTokens', () => () => mockUseTokenApi())
jest.mock('../api/hooks/useConfigApi', () => () => mockUseConfigApi())
jest.mock('../api/hooks/useRegistrationApi', () => () => mockUseRegistrationApi())

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockUseNavigation(),
}))

jest.mock('@/contexts/NavigationContainerContext', () => ({
  useNavigationContainer: () => mockUseNavigationContainer(),
}))

// --------------------
// System checks
// --------------------
jest.mock('@/services/system-checks/AnalyticsSystemCheck', () => ({
  AnalyticsSystemCheck: class AnalyticsSystemCheck {},
}))

jest.mock('@/services/system-checks/ServerStatusSystemCheck', () => ({
  ServerStatusSystemCheck: class ServerStatusSystemCheck {},
}))

jest.mock('@/services/system-checks/UpdateAppSystemCheck', () => ({
  UpdateAppSystemCheck: class UpdateAppSystemCheck {},
}))

jest.mock('@/services/system-checks/DeviceInvalidatedSystemCheck', () => ({
  DeviceInvalidatedSystemCheck: class DeviceInvalidatedSystemCheck {},
}))

jest.mock('@/services/system-checks/DeviceCountSystemCheck', () => ({
  DeviceCountSystemCheck: class DeviceCountSystemCheck {},
}))

jest.mock('@/services/system-checks/AccountExpiryWarningBannerSystemCheck', () => ({
  AccountExpiryWarningBannerSystemCheck: class AccountExpiryWarningBannerSystemCheck {},
}))

jest.mock('@/services/system-checks/UpdateDeviceRegistrationSystemCheck', () => ({
  UpdateDeviceRegistrationSystemCheck: class UpdateDeviceRegistrationSystemCheck {},
}))

jest.mock('@/services/system-checks/ServerClockSkewSystemCheck', () => ({
  ServerClockSkewSystemCheck: class ServerClockSkewSystemCheck {},
}))

describe('useGetSystemChecks', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('STARTUP scope', () => {
    describe('isReady', () => {
      it('should be ready when all flags ready', () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
        mockUseStore.mockReturnValue([
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

        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])

        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })

        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })

        mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')

        jest.spyOn(React, 'useContext').mockReturnValue({ account: {} })

        const { result } = renderHook(() => useCreateSystemChecks())

        expect(result.current[SystemCheckScope.STARTUP].isReady).toBe(true)
      })
    })

    describe('getSystemChecks', () => {
      it('should return the correct system checks for STARTUP scope', async () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
        mockUseStore.mockReturnValue([
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

        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])

        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })

        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })

        mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')

        jest.spyOn(React, 'useContext').mockReturnValue({ account: {} })

        mockUseConfigApi.mockReturnValue({
          getServerStatus: jest.fn().mockReturnValue({ serverTimestamp: new Date() }),
        })

        const { result } = renderHook(() => useCreateSystemChecks())

        const systemChecks = await result.current[SystemCheckScope.STARTUP].getSystemChecks()

        expect(systemChecks).toHaveLength(4) // AnalyticsSystemCheck, ServerStatusSystemCheck, ServerClockSkewSystemCheck, UpdateAppSystemCheck
        expect(systemChecks[0].constructor.name).toBe('AnalyticsSystemCheck')
        expect(systemChecks[1].constructor.name).toBe('ServerStatusSystemCheck')
        expect(systemChecks[2].constructor.name).toBe('ServerClockSkewSystemCheck')
        expect(systemChecks[3].constructor.name).toBe('UpdateAppSystemCheck')
      })

      it('should not include UpdateAppSystemCheck for non-BCSC builds', async () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.bad')
        mockUseStore.mockReturnValue([
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

        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])

        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })

        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })

        mockGetBundleId.mockReturnValue('ca.bc.gov.BCWallet')

        jest.spyOn(React, 'useContext').mockReturnValue({ account: {} })

        mockUseConfigApi.mockReturnValue({
          getServerStatus: jest.fn().mockReturnValue({ serverTimestamp: new Date() }),
        })

        const { result } = renderHook(() => useCreateSystemChecks())

        const systemChecks = await result.current[SystemCheckScope.STARTUP].getSystemChecks()

        expect(systemChecks).toHaveLength(3) // AnalyticsSystemCheck, ServerClockSkewSystemCheck, ServerStatusSystemCheck
        expect(systemChecks[0].constructor.name).toBe('AnalyticsSystemCheck')
        expect(systemChecks[1].constructor.name).toBe('ServerStatusSystemCheck')
        expect(systemChecks[2].constructor.name).toBe('ServerClockSkewSystemCheck')
      })
    })
  })

  describe('MAIN_STACK scope', () => {
    describe('isReady', () => {
      it('should be ready when all flags ready ', () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
        mockUseStore.mockReturnValue([
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

        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])

        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })

        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })

        mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')

        jest.spyOn(React, 'useContext').mockReturnValue({ account: { account_expiration_date: new Date() } })

        const { result } = renderHook(() => useCreateSystemChecks())

        expect(result.current[SystemCheckScope.MAIN_STACK].isReady).toBe(true)
      })
    })

    describe('getSystemChecks', () => {
      it('should return the correct system checks for MAIN_STACK scope', async () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
        mockUseStore.mockReturnValue([
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

        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])

        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })

        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })

        mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')

        jest.spyOn(React, 'useContext').mockReturnValue({ account: { account_expiration_date: new Date() } })

        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn() })
        mockUseRegistrationApi.mockReturnValue({})

        const { result } = renderHook(() => useCreateSystemChecks())

        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks).toHaveLength(4) // DeviceInvalidatedSystemCheck, DeviceCountSystemCheck, AccountExpiryWarningBannerSystemCheck, UpdateDeviceRegistrationSystemCheck
        expect(systemChecks[0].constructor.name).toBe('DeviceInvalidatedSystemCheck')
        expect(systemChecks[1].constructor.name).toBe('DeviceCountSystemCheck')
        expect(systemChecks[2].constructor.name).toBe('AccountExpiryWarningBannerSystemCheck')
        expect(systemChecks[3].constructor.name).toBe('UpdateDeviceRegistrationSystemCheck')
      })
    })
  })
})
