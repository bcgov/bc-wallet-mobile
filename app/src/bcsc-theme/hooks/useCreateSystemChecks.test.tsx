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
export const mockUseEvidenceService = jest.fn()
export const mockUseNavigation = jest.fn()
export const mockUseNavigationContainer = jest.fn()
export const mockGetBundleId = jest.fn()
export const mockUseSecureActions = jest.fn()

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

jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: () => mockUseSecureActions(),
}))

jest.mock('@/bcsc-theme/api/hooks/useTokens', () => () => mockUseTokenApi())
jest.mock('../api/hooks/useConfigApi', () => () => mockUseConfigApi())
jest.mock('../api/hooks/useRegistrationApi', () => () => mockUseRegistrationApi())
jest.mock('../services/hooks/useEvidenceService', () => ({
  useEvidenceService: () => mockUseEvidenceService(),
}))

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockUseNavigation(),
}))

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
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

jest.mock('@/services/system-checks/DeviceCountSystemCheck', () => ({
  DeviceCountSystemCheck: class DeviceCountSystemCheck {},
}))

jest.mock('@/services/system-checks/AccountExpirySystemCheck', () => ({
  AccountExpirySystemCheck: class AccountExpirySystemCheck {},
}))

jest.mock('@/services/system-checks/AccountRenewalSystemCheck', () => ({
  AccountRenewalSystemCheck: class AccountRenewalSystemCheck {},
}))

jest.mock('@/services/system-checks/UpdateDeviceRegistrationSystemCheck', () => ({
  UpdateDeviceRegistrationSystemCheck: class UpdateDeviceRegistrationSystemCheck {},
}))

jest.mock('@/services/system-checks/KeyRotationSystemCheck', () => ({
  KeyRotationSystemCheck: class KeyRotationSystemCheck {
    deferForPendingRegistrationUpdate: boolean
    lastRotationAttemptAt: unknown
    rotate: unknown
    utils: unknown

    constructor(
      deferForPendingRegistrationUpdate: boolean,
      lastRotationAttemptAt: unknown,
      rotate: unknown,
      utils: unknown
    ) {
      this.deferForPendingRegistrationUpdate = deferForPendingRegistrationUpdate
      this.lastRotationAttemptAt = lastRotationAttemptAt
      this.rotate = rotate
      this.utils = utils
    }
  },
}))

jest.mock('@/services/system-checks/EventReasonAlertsSystemCheck', () => ({
  EventReasonAlertsSystemCheck: class EventReasonAlertsSystemCheck {},
}))

jest.mock('@/services/system-checks/InstallIdSystemCheck', () => ({
  InstallIdSystemCheck: class InstallIdSystemCheck {},
}))

jest.mock('@/services/system-checks/ServerClockSkewSystemCheck', () => ({
  ServerClockSkewSystemCheck: class ServerClockSkewSystemCheck {},
}))

jest.mock('@/services/system-checks/TermsOfUseSystemCheck', () => ({
  TermsOfUseSystemCheck: class TermsOfUseSystemCheck {},
}))

jest.mock('@/services/system-checks/VerificationSessionExpiredSystemCheck', () => ({
  VerificationSessionExpiredSystemCheck: class VerificationSessionExpiredSystemCheck {},
  getPendingDeviceCodeExpiry: jest.fn(),
}))

jest.mock('@/services/system-checks/VerificationRequestStatusSystemCheck', () => ({
  VerificationRequestStatusSystemCheck: class VerificationRequestStatusSystemCheck {
    getVerificationRequestStatus: () => Promise<unknown>
    checkDeviceCodeStatus: () => Promise<unknown>
    utils: unknown

    constructor(
      getVerificationRequestStatus: () => Promise<unknown>,
      checkDeviceCodeStatus: () => Promise<unknown>,
      utils: unknown
    ) {
      this.getVerificationRequestStatus = getVerificationRequestStatus
      this.checkDeviceCodeStatus = checkDeviceCodeStatus
      this.utils = utils
    }
  },
}))

jest.mock('@/services/system-checks/PendingVerificationRecoverySystemCheck', () => ({
  PendingVerificationRecoverySystemCheck: class PendingVerificationRecoverySystemCheck {
    checkVerificationStatus: () => Promise<boolean>
    utils: unknown

    constructor(checkVerificationStatus: () => Promise<boolean>, utils: unknown) {
      this.checkVerificationStatus = checkVerificationStatus
      this.utils = utils
    }
  },
}))

jest.mock('@/bcsc-theme/components/AppBanner', () => ({
  BCSCBanner: {
    IAS_SERVER_UNAVAILABLE: 'IASServerUnavailableBanner',
    IAS_SERVER_NOTIFICATION: 'IASServerNotificationBanner',
  },
}))

jest.mock('@/store', () => ({
  BCDispatchAction: {
    REMOVE_BANNER_MESSAGE: 'bcsc/removeBannerMessage',
    SET_INSTALL_ID: 'bcsc/setInstallId',
    RECORD_APP_LAUNCH_VERSION: 'bcsc/recordAppLaunchVersion',
  },
}))

describe('useGetSystemChecks', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockUseSecureActions.mockReturnValue({ updateTokens: jest.fn() })
  })

  describe('STARTUP scope', () => {
    describe('isReady', () => {
      it('should be ready when all flags ready', () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: {
              environment: {
                analyticsAppId: 'test-app-id',
              },
            },
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
            developer: {
              environment: {
                analyticsAppId: 'test-app-id',
              },
            },
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

        expect(systemChecks).toHaveLength(5) // InstallIdSystemCheck, AnalyticsSystemCheck, ServerStatusSystemCheck, ServerClockSkewSystemCheck, UpdateAppSystemCheck
        expect(systemChecks[0].constructor.name).toBe('InstallIdSystemCheck')
        expect(systemChecks[1].constructor.name).toBe('AnalyticsSystemCheck')
        expect(systemChecks[2].constructor.name).toBe('ServerStatusSystemCheck')
        expect(systemChecks[3].constructor.name).toBe('ServerClockSkewSystemCheck')
        expect(systemChecks[4].constructor.name).toBe('UpdateAppSystemCheck')
      })

      it('should not include UpdateAppSystemCheck for non-BCSC builds', async () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.bad')
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: {
              environment: {
                analyticsAppId: 'test-app-id',
              },
            },
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

        expect(systemChecks).toHaveLength(4) // InstallIdSystemCheck, AnalyticsSystemCheck, ServerStatusSystemCheck, ServerClockSkewSystemCheck
        expect(systemChecks[0].constructor.name).toBe('InstallIdSystemCheck')
        expect(systemChecks[1].constructor.name).toBe('AnalyticsSystemCheck')
        expect(systemChecks[2].constructor.name).toBe('ServerStatusSystemCheck')
        expect(systemChecks[3].constructor.name).toBe('ServerClockSkewSystemCheck')
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
            developer: {
              environment: {
                analyticsAppId: 'test-app-id',
              },
            },
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
            developer: {
              environment: {
                analyticsAppId: 'test-app-id',
              },
            },
            bcsc: {
              analyticsOptIn: true,
              selectedNickname: 'Test Device',
            },
            bcscSecure: {
              isHydrated: true,
              verified: true,
              registrationAccessToken: 'test-registration-token',
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
        mockUseConfigApi.mockReturnValue({ getTermsOfUse: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())

        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks).toHaveLength(5)
        expect(systemChecks[0].constructor.name).toBe('DeviceCountSystemCheck')
        expect(systemChecks[1].constructor.name).toBe('EventReasonAlertsSystemCheck')
        expect(systemChecks[2].constructor.name).toBe('TermsOfUseSystemCheck')
        expect(systemChecks[3].constructor.name).toBe('UpdateDeviceRegistrationSystemCheck')
        expect(systemChecks[4].constructor.name).toBe('KeyRotationSystemCheck')
      })

      it('skips the id-token / account checks for an unverified user but still runs Terms of Use', async () => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: {
              environment: {
                analyticsAppId: 'test-app-id',
              },
            },
            bcsc: {
              analyticsOptIn: true,
            },
            bcscSecure: {
              isHydrated: true,
              verified: false,
            },
          },
          jest.fn(),
        ])

        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
        mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')
        // Unverified users have no loaded account
        jest.spyOn(React, 'useContext').mockReturnValue({ account: null })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn() })
        mockUseRegistrationApi.mockReturnValue({})
        mockUseConfigApi.mockReturnValue({ getTermsOfUse: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())

        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const names = systemChecks.map((check) => check.constructor.name)

        // Token-dependent checks would call getIdToken (which surfaces a user-facing
        // "token null" error for unverified users), so they are skipped — but the
        // account-independent Terms of Use check still runs.
        expect(names).toContain('TermsOfUseSystemCheck')
        expect(names).not.toContain('DeviceCountSystemCheck')
        expect(names).not.toContain('EventReasonAlertsSystemCheck')
        expect(names).not.toContain('AccountExpirySystemCheck')
        expect(names).not.toContain('AccountRenewalSystemCheck')
        expect(names).not.toContain('AccountExpiryWarningBannerSystemCheck')
        // No chosen nickname / registration token yet, so there's nothing to re-register — the
        // device-registration update check is skipped (otherwise it throws "No client name found").
        expect(names).not.toContain('UpdateDeviceRegistrationSystemCheck')
        // Key rotation requires isVerified — an unverified user is still mid-setup and should
        // never have its keys touched automatically.
        expect(names).not.toContain('KeyRotationSystemCheck')
      })
    })

    describe('KeyRotationSystemCheck', () => {
      const mockStoreWith = (bcscSecureOverrides: Record<string, unknown>, bundleId = 'ca.bc.gov.id.servicescard') => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue(bundleId)
        mockGetBundleId.mockReturnValue(bundleId)
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: { environment: { analyticsAppId: 'test-app-id' } },
            bcsc: { analyticsOptIn: true, selectedNickname: 'Test Device' },
            bcscSecure: {
              isHydrated: true,
              verified: true,
              registrationAccessToken: 'test-registration-token',
              ...bcscSecureOverrides,
            },
          },
          jest.fn(),
        ])
        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
        jest.spyOn(React, 'useContext').mockReturnValue({ account: { account_expiration_date: new Date() } })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn() })
        mockUseRegistrationApi.mockReturnValue({})
        mockUseConfigApi.mockReturnValue({ getTermsOfUse: jest.fn() })
      }

      it('is included for a verified, registered BCSC-build user', async () => {
        mockStoreWith({})

        const { result } = renderHook(() => useCreateSystemChecks())
        const names = (await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()).map(
          (check) => check.constructor.name
        )

        expect(names).toContain('KeyRotationSystemCheck')
      })

      it('is not included without a registrationAccessToken', async () => {
        mockStoreWith({ registrationAccessToken: undefined })

        const { result } = renderHook(() => useCreateSystemChecks())
        const names = (await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()).map(
          (check) => check.constructor.name
        )

        expect(names).not.toContain('KeyRotationSystemCheck')
      })

      it('is not included for a non-BCSC bundle', async () => {
        mockStoreWith({}, 'ca.bc.gov.BCWallet')

        const { result } = renderHook(() => useCreateSystemChecks())
        const names = (await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()).map(
          (check) => check.constructor.name
        )

        expect(names).not.toContain('KeyRotationSystemCheck')
      })

      const findKeyRotationCheck = async () => {
        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        return systemChecks.find((check) => check.constructor.name === 'KeyRotationSystemCheck') as any
      }

      describe('deferForPendingRegistrationUpdate (the app-version-changed signal)', () => {
        it('is false when lastSeenAppVersion/lastSeenAppBuildNumber already match this launch', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          mockUseStore.mockReturnValue([
            {
              stateLoaded: true,
              developer: { environment: { analyticsAppId: 'test-app-id' } },
              bcsc: {
                analyticsOptIn: true,
                selectedNickname: 'Test Device',
                lastSeenAppVersion: '4.1.0',
                lastSeenAppBuildNumber: '1000',
              },
              bcscSecure: { isHydrated: true, verified: true, registrationAccessToken: 'test-registration-token' },
            },
            jest.fn(),
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(false)
        })

        it('is true when lastSeenAppVersion differs from the current launch (first launch on a new version)', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          mockUseStore.mockReturnValue([
            {
              stateLoaded: true,
              developer: { environment: { analyticsAppId: 'test-app-id' } },
              bcsc: {
                analyticsOptIn: true,
                selectedNickname: 'Test Device',
                lastSeenAppVersion: '4.0.0',
                lastSeenAppBuildNumber: '999',
              },
              bcscSecure: { isHydrated: true, verified: true, registrationAccessToken: 'test-registration-token' },
            },
            jest.fn(),
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(true)
        })

        // Population 1 (#3876 review): a verified user whose selectedNickname is falsy (never
        // named the device, or lost to the #4258 AsyncStorage race) never gets
        // UpdateDeviceRegistrationSystemCheck constructed at all. Under the old (buggy)
        // implementation — which read store.bcsc.appVersion directly — this left appVersion
        // permanently blank, deferring key rotation forever. It must NOT defer here.
        it('still rotates when due for a verified user with no selectedNickname (population 1)', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
          mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')
          mockUseStore.mockReturnValue([
            {
              stateLoaded: true,
              developer: { environment: { analyticsAppId: 'test-app-id' } },
              bcsc: {
                analyticsOptIn: true,
                selectedNickname: undefined,
                lastSeenAppVersion: '4.1.0',
                lastSeenAppBuildNumber: '1000',
              },
              bcscSecure: { isHydrated: true, verified: true, registrationAccessToken: 'test-registration-token' },
            },
            jest.fn(),
          ])
          mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
          mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
          mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
          jest.spyOn(React, 'useContext').mockReturnValue({ account: { account_expiration_date: new Date() } })
          mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn() })
          mockUseRegistrationApi.mockReturnValue({})
          mockUseConfigApi.mockReturnValue({ getTermsOfUse: jest.fn() })

          const { result } = renderHook(() => useCreateSystemChecks())
          const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
          const names = systemChecks.map((check) => check.constructor.name)
          const check = systemChecks.find((c) => c.constructor.name === 'KeyRotationSystemCheck') as any

          expect(names).not.toContain('UpdateDeviceRegistrationSystemCheck')
          expect(names).toContain('KeyRotationSystemCheck')
          expect(check.deferForPendingRegistrationUpdate).toBe(false)
        })

        // Population 2 (#3876 review): UpdateDeviceRegistrationSystemCheck keeps being
        // constructed and its own PUT keeps failing, so store.bcsc.appVersion/appBuildNumber
        // (only advanced on a SUCCESSFUL PUT) stay stuck on an old value forever. Because
        // lastSeenAppVersion/lastSeenAppBuildNumber are stamped unconditionally every launch
        // (independent of registration success), key rotation must NOT defer here either.
        it('still rotates when due even though appVersion is permanently stale from a persistently-failing PUT (population 2)', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          mockUseStore.mockReturnValue([
            {
              stateLoaded: true,
              developer: { environment: { analyticsAppId: 'test-app-id' } },
              bcsc: {
                analyticsOptIn: true,
                selectedNickname: 'Test Device',
                // Stuck on the OLD version — the registration PUT that would advance these via
                // UPDATE_APP_VERSION keeps failing.
                appVersion: '3.9.0',
                appBuildNumber: '1',
                // But the per-launch marker IS current, since it's stamped unconditionally.
                lastSeenAppVersion: '4.1.0',
                lastSeenAppBuildNumber: '1000',
              },
              bcscSecure: { isHydrated: true, verified: true, registrationAccessToken: 'test-registration-token' },
            },
            jest.fn(),
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(false)
        })
      })
    })

    describe('VerificationRequestStatusSystemCheck', () => {
      const mockStoreWith = (bcscSecureOverrides: Record<string, unknown>) => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.bad')
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: { environment: { analyticsAppId: 'test-app-id' } },
            bcsc: { analyticsOptIn: true },
            bcscSecure: { isHydrated: true, verified: false, ...bcscSecureOverrides },
          },
          jest.fn(),
        ])
        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
        mockGetBundleId.mockReturnValue('ca.bc.gov.BCWallet')
        jest.spyOn(React, 'useContext').mockReturnValue({ account: null })
        mockUseConfigApi.mockReturnValue({ getTermsOfUse: jest.fn() })
        mockUseRegistrationApi.mockReturnValue({})
      }

      it('is not added when there is no verificationRequestId', async () => {
        mockStoreWith({ verificationRequestId: undefined })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn() })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks.map((c) => c.constructor.name)).not.toContain('VerificationRequestStatusSystemCheck')
      })

      it('is not added once the user is verified, even with a verificationRequestId', async () => {
        mockStoreWith({ verified: true, verificationRequestId: 'req-1' })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn() })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks.map((c) => c.constructor.name)).not.toContain('VerificationRequestStatusSystemCheck')
      })

      it('is added when unverified with a pending verificationRequestId', async () => {
        mockStoreWith({ verificationRequestId: 'req-1', deviceCode: 'device-1', userCode: 'user-1' })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus: jest.fn() })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks.map((c) => c.constructor.name)).toContain('VerificationRequestStatusSystemCheck')
      })

      it('wires its status getter to evidenceApi.getVerificationRequestStatus for the pending request', async () => {
        mockStoreWith({ verificationRequestId: 'req-1', deviceCode: 'device-1', userCode: 'user-1' })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus: jest.fn() })
        const getVerificationRequestStatus = jest.fn().mockResolvedValue({ status: 'pending' })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const check = systemChecks.find((c) => c.constructor.name === 'VerificationRequestStatusSystemCheck') as any

        await check.getVerificationRequestStatus()

        expect(getVerificationRequestStatus).toHaveBeenCalledWith('req-1')
      })

      it('rejects the token exchange when deviceCode or userCode is missing', async () => {
        mockStoreWith({ verificationRequestId: 'req-1', deviceCode: undefined, userCode: undefined })
        const checkDeviceCodeStatus = jest.fn()
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const check = systemChecks.find((c) => c.constructor.name === 'VerificationRequestStatusSystemCheck') as any

        await expect(check.checkDeviceCodeStatus()).rejects.toThrow(
          'Missing deviceCode or userCode for verification token exchange'
        )
        expect(checkDeviceCodeStatus).not.toHaveBeenCalled()
      })

      it('exchanges the device code via tokenApi.checkDeviceCodeStatus when both codes are present', async () => {
        mockStoreWith({ verificationRequestId: 'req-1', deviceCode: 'device-1', userCode: 'user-1' })
        const checkDeviceCodeStatus = jest.fn().mockResolvedValue(undefined)
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const check = systemChecks.find((c) => c.constructor.name === 'VerificationRequestStatusSystemCheck') as any

        await check.checkDeviceCodeStatus()

        expect(checkDeviceCodeStatus).toHaveBeenCalledWith('device-1', 'user-1')
      })

      it('skips the token exchange when a refreshToken already exists (device code already redeemed)', async () => {
        mockStoreWith({
          verificationRequestId: 'req-1',
          deviceCode: 'device-1',
          userCode: 'user-1',
          refreshToken: 'existing-refresh-token',
        })
        const checkDeviceCodeStatus = jest.fn()
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus })
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const check = systemChecks.find((c) => c.constructor.name === 'VerificationRequestStatusSystemCheck') as any

        await expect(check.checkDeviceCodeStatus()).resolves.toBeUndefined()
        expect(checkDeviceCodeStatus).not.toHaveBeenCalled()
      })
    })

    describe('PendingVerificationRecoverySystemCheck', () => {
      const mockStoreWith = (bcscSecureOverrides: Record<string, unknown>) => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.bad')
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: { environment: { analyticsAppId: 'test-app-id' } },
            bcsc: { analyticsOptIn: true },
            bcscSecure: { isHydrated: true, verified: false, ...bcscSecureOverrides },
          },
          jest.fn(),
        ])
        mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
        mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
        mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
        mockGetBundleId.mockReturnValue('ca.bc.gov.BCWallet')
        jest.spyOn(React, 'useContext').mockReturnValue({ account: null })
        mockUseConfigApi.mockReturnValue({ getTermsOfUse: jest.fn() })
        mockUseRegistrationApi.mockReturnValue({})
        mockUseEvidenceService.mockReturnValue({ getVerificationRequestStatus: jest.fn() })
      }

      it('is not added when there is no pending deviceCode/userCode', async () => {
        mockStoreWith({ deviceCode: undefined, userCode: undefined })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks.map((c) => c.constructor.name)).not.toContain('PendingVerificationRecoverySystemCheck')
      })

      it('is not added once the user is verified, even with deviceCode/userCode present', async () => {
        mockStoreWith({ verified: true, deviceCode: 'device-1', userCode: 'user-1' })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks.map((c) => c.constructor.name)).not.toContain('PendingVerificationRecoverySystemCheck')
      })

      it('is not added when a verificationRequestId is present — the backcheck check handles that case', async () => {
        mockStoreWith({ verificationRequestId: 'req-1', deviceCode: 'device-1', userCode: 'user-1' })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const names = systemChecks.map((c) => c.constructor.name)

        expect(names).toContain('VerificationRequestStatusSystemCheck')
        expect(names).not.toContain('PendingVerificationRecoverySystemCheck')
      })

      it('is added when unverified with a pending deviceCode/userCode and no verificationRequestId', async () => {
        mockStoreWith({ deviceCode: 'device-1', userCode: 'user-1' })
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus: jest.fn() })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()

        expect(systemChecks.map((c) => c.constructor.name)).toContain('PendingVerificationRecoverySystemCheck')
      })

      it('wires checkVerificationStatus to the token service using the pending device/user code', async () => {
        mockStoreWith({ deviceCode: 'device-2', userCode: 'user-2' })
        const checkDeviceCodeStatus = jest.fn().mockResolvedValue(undefined)
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const check = systemChecks.find((c) => c.constructor.name === 'PendingVerificationRecoverySystemCheck') as any

        await check.checkVerificationStatus()

        expect(checkDeviceCodeStatus).toHaveBeenCalledWith('device-2', 'user-2')
      })

      it('reports success without a network call when a refreshToken already exists (device code already redeemed)', async () => {
        mockStoreWith({ deviceCode: 'device-2', userCode: 'user-2', refreshToken: 'existing-refresh-token' })
        const checkDeviceCodeStatus = jest.fn()
        mockUseTokenApi.mockReturnValue({ getCachedIdTokenMetadata: jest.fn(), checkDeviceCodeStatus })

        const { result } = renderHook(() => useCreateSystemChecks())
        const systemChecks = await result.current[SystemCheckScope.MAIN_STACK].getSystemChecks()
        const check = systemChecks.find((c) => c.constructor.name === 'PendingVerificationRecoverySystemCheck') as any

        await expect(check.checkVerificationStatus()).resolves.toBe(true)
        expect(checkDeviceCodeStatus).not.toHaveBeenCalled()
      })
    })
  })

  describe('VERIFY scope', () => {
    const mockHydratedStore = () => {
      mockUseStore.mockReturnValue([
        {
          stateLoaded: true,
          developer: { environment: { analyticsAppId: 'test-app-id' } },
          bcsc: { analyticsOptIn: true },
          bcscSecure: { isHydrated: true },
        },
        jest.fn(),
      ])
      mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
      mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
      mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
      jest.spyOn(React, 'useContext').mockReturnValue({ account: {} })
    }

    it('should be ready when secure state is hydrated', () => {
      jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
      mockHydratedStore()

      const { result } = renderHook(() => useCreateSystemChecks())

      expect(result.current[SystemCheckScope.VERIFY].isReady).toBe(true)
    })

    it('should return the VerificationSessionExpiredSystemCheck', async () => {
      jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
      mockHydratedStore()

      const { result } = renderHook(() => useCreateSystemChecks())

      const systemChecks = await result.current[SystemCheckScope.VERIFY].getSystemChecks()

      expect(systemChecks).toHaveLength(1)
      expect(systemChecks[0].constructor.name).toBe('VerificationSessionExpiredSystemCheck')
    })
  })

  describe('ACCOUNT scope', () => {
    const mockHydratedStore = () => {
      mockUseStore.mockReturnValue([
        {
          stateLoaded: true,
          developer: { environment: { analyticsAppId: 'test-app-id' } },
          bcsc: { analyticsOptIn: true },
          bcscSecure: { isHydrated: true },
        },
        jest.fn(),
      ])
      mockUseServices.mockReturnValue([{ info: jest.fn(), error: jest.fn() }])
      mockUseBCSCApiClientState.mockReturnValue({ client: {}, isClientReady: true })
      mockUseNavigationContainer.mockReturnValue({ isNavigationReady: true })
      jest.spyOn(React, 'useContext').mockReturnValue({ account: {} })
    }

    it('should return no AccountSystemChecks with no accountExpirationDate', async () => {
      jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
      mockHydratedStore()

      const { result } = renderHook(() => useCreateSystemChecks())
      const systemChecks = await result.current[SystemCheckScope.ACCOUNT].getSystemChecks()

      expect(systemChecks).toHaveLength(0)
    })

    it('should return 2 AccountSystemChecks with accountExpirationDate set', async () => {
      jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
      mockHydratedStore()
      jest.spyOn(React, 'useContext').mockReturnValue({ account: { card_expiry: new Date() } })

      const { result } = renderHook(() => useCreateSystemChecks())
      const systemChecks = await result.current[SystemCheckScope.ACCOUNT].getSystemChecks()

      expect(systemChecks).toHaveLength(2)
      expect(systemChecks[0].constructor.name).toBe('AccountExpirySystemCheck')
      expect(systemChecks[1].constructor.name).toBe('AccountRenewalSystemCheck')
    })
  })
})
