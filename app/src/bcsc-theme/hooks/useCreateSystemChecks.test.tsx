import { BCDispatchAction } from '@/store'
import { renderHook } from '@testing-library/react-native'
import React from 'react'
import { getAccount, getToken, TokenType } from 'react-native-bcsc-core'
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
export const mockRotateSigningKey = jest.fn()

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

jest.mock('@/bcsc-theme/utils/key-rotation', () => ({
  rotateSigningKey: (...args: unknown[]) => mockRotateSigningKey(...args),
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
      const mockStoreWith = (
        bcscSecureOverrides: Record<string, unknown>,
        bundleId = 'ca.bc.gov.id.servicescard',
        bcscOverrides: Record<string, unknown> = {}
      ) => {
        jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue(bundleId)
        mockGetBundleId.mockReturnValue(bundleId)
        mockUseStore.mockReturnValue([
          {
            stateLoaded: true,
            developer: { environment: { analyticsAppId: 'test-app-id' } },
            bcsc: { analyticsOptIn: true, selectedNickname: 'Test Device', ...bcscOverrides },
            bcscSecure: {
              isHydrated: true,
              verified: true,
              registrationAccessToken: 'test-registration-token',
              ...bcscSecureOverrides,
            },
          },
          jest.fn(),
        ])
        mockUseServices.mockReturnValue([{ info: jest.fn(), warn: jest.fn(), error: jest.fn() }])
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
        // RECORD_APP_LAUNCH_VERSION is the only thing keeping lastSeenApp* current; losing it
        // would latch rotation off forever. Every test here asserts the dispatch too, not just
        // the boolean passed to the constructor.
        it('does NOT dispatch RECORD_APP_LAUNCH_VERSION, and defers, when lastSeen already matches this launch', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          const dispatch = jest.fn()
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
            dispatch,
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(false)
          expect(dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION })
          )
        })

        it('DISPATCHES RECORD_APP_LAUNCH_VERSION with the current version/build, and defers, on the first launch of a new version', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          const dispatch = jest.fn()
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
            dispatch,
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(true)
          expect(dispatch).toHaveBeenCalledWith({
            type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION,
            payload: [{ version: '4.1.0', buildNumber: '1000' }],
          })
        })

        // Population 1: no selectedNickname means UpdateDeviceRegistrationSystemCheck is never
        // constructed, so reading its signal directly (the old, buggy approach) would defer
        // rotation forever. The per-launch marker must not be fooled by this.
        it('does not defer, and needs no RECORD_APP_LAUNCH_VERSION dispatch, for a verified user with no selectedNickname (population 1)', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          jest.spyOn(DeviceInfo, 'getBundleId').mockReturnValue('ca.bc.gov.id.servicescard')
          mockGetBundleId.mockReturnValue('ca.bc.gov.id.servicescard')
          const dispatch = jest.fn()
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
            dispatch,
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
          expect(dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION })
          )
        })

        // Population 2: appVersion is stuck (its owning PUT keeps failing), but lastSeenApp* is
        // stamped independent of that success, so rotation must still not defer here.
        it('does not defer, and needs no RECORD_APP_LAUNCH_VERSION dispatch, even though appVersion is permanently stale from a persistently-failing PUT (population 2)', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          const dispatch = jest.fn()
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
            dispatch,
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(false)
          expect(dispatch).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION })
          )
        })

        // Same population 2 setup, but lastSeen itself is stale — the dispatch must still fire.
        it('DISPATCHES RECORD_APP_LAUNCH_VERSION even with a stale appVersion from a persistently-failing PUT, when lastSeen itself is stale', async () => {
          jest.spyOn(DeviceInfo, 'getVersion').mockReturnValue('4.1.0')
          jest.spyOn(DeviceInfo, 'getBuildNumber').mockReturnValue('1000')
          mockStoreWith({})
          const dispatch = jest.fn()
          mockUseStore.mockReturnValue([
            {
              stateLoaded: true,
              developer: { environment: { analyticsAppId: 'test-app-id' } },
              bcsc: {
                analyticsOptIn: true,
                selectedNickname: 'Test Device',
                appVersion: '3.9.0',
                appBuildNumber: '1',
                lastSeenAppVersion: '4.0.0',
                lastSeenAppBuildNumber: '999',
              },
              bcscSecure: { isHydrated: true, verified: true, registrationAccessToken: 'test-registration-token' },
            },
            dispatch,
          ])

          const check = await findKeyRotationCheck()

          expect(check.deferForPendingRegistrationUpdate).toBe(true)
          expect(dispatch).toHaveBeenCalledWith({
            type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION,
            payload: [{ version: '4.1.0', buildNumber: '1000' }],
          })
        })
      })

      it('passes store.bcsc.lastKeyRotationAttemptAt through to the constructor unchanged', async () => {
        mockStoreWith({}, 'ca.bc.gov.id.servicescard', { lastKeyRotationAttemptAt: '2026-01-01T00:00:00.000Z' })

        const check = await findKeyRotationCheck()

        expect(check.lastRotationAttemptAt).toBe('2026-01-01T00:00:00.000Z')
      })

      // Nothing in these tests exercises the KeyRotationSystemCheck class itself (it's mocked
      // above to just record its constructor args) — this drives the captured `rotate` closure
      // directly, the way the real class's onFail would.
      describe('rotate (the closure passed to KeyRotationSystemCheck)', () => {
        const mockUpdateTokens = jest.fn()

        beforeEach(() => {
          mockUseSecureActions.mockReturnValue({ updateTokens: mockUpdateTokens })
          mockRotateSigningKey.mockResolvedValue({ status: 'rotated', confirmed: true })
        })

        it('prefers a freshly-read native registration token over the render-time store value', async () => {
          mockStoreWith({ registrationAccessToken: 'store-registration-token' })
          jest.mocked(getToken).mockResolvedValue({
            id: 'tok-1',
            type: TokenType.Registration,
            token: 'native-registration-token',
            created: 0,
          })
          jest.mocked(getAccount).mockResolvedValue({ clientID: 'client-abc' } as any)

          const check = await findKeyRotationCheck()
          await check.rotate()

          expect(getToken).toHaveBeenCalledWith(TokenType.Registration)
          expect(mockRotateSigningKey).toHaveBeenCalledWith(
            expect.anything(),
            'client-abc',
            'native-registration-token',
            expect.anything()
          )
        })

        it('falls back to the store registration token when the native read comes back empty', async () => {
          mockStoreWith({ registrationAccessToken: 'store-registration-token' })
          jest.mocked(getToken).mockResolvedValue(null)
          jest.mocked(getAccount).mockResolvedValue({ clientID: 'client-abc' } as any)

          const check = await findKeyRotationCheck()
          await check.rotate()

          expect(mockRotateSigningKey).toHaveBeenCalledWith(
            expect.anything(),
            'client-abc',
            'store-registration-token',
            expect.anything()
          )
        })

        it('skips rotateSigningKey and returns a failed, unconfirmed result when the client ID is missing', async () => {
          mockStoreWith({ registrationAccessToken: 'store-registration-token' })
          jest.mocked(getToken).mockResolvedValue(null)
          jest.mocked(getAccount).mockResolvedValue(null)

          const check = await findKeyRotationCheck()
          const result = await check.rotate()

          expect(result).toEqual({ status: 'failed', confirmed: false })
          expect(mockRotateSigningKey).not.toHaveBeenCalled()
        })

        it('syncs the rotated registration token into the store when rotateSigningKey returns one', async () => {
          mockStoreWith({ registrationAccessToken: 'store-registration-token' })
          jest.mocked(getToken).mockResolvedValue({
            id: 'tok-1',
            type: TokenType.Registration,
            token: 'native-registration-token',
            created: 0,
          })
          jest.mocked(getAccount).mockResolvedValue({ clientID: 'client-abc' } as any)
          mockRotateSigningKey.mockResolvedValue({
            status: 'rotated',
            confirmed: true,
            newRegistrationAccessToken: 'rotated-registration-token',
          })

          const check = await findKeyRotationCheck()
          await check.rotate()

          expect(mockUpdateTokens).toHaveBeenCalledWith({ registrationAccessToken: 'rotated-registration-token' })
        })

        it('does not touch the store when rotateSigningKey returns no rotated token', async () => {
          mockStoreWith({ registrationAccessToken: 'store-registration-token' })
          jest.mocked(getToken).mockResolvedValue({
            id: 'tok-1',
            type: TokenType.Registration,
            token: 'native-registration-token',
            created: 0,
          })
          jest.mocked(getAccount).mockResolvedValue({ clientID: 'client-abc' } as any)
          mockRotateSigningKey.mockResolvedValue({ status: 'rotated', confirmed: true })

          const check = await findKeyRotationCheck()
          await check.rotate()

          expect(mockUpdateTokens).not.toHaveBeenCalled()
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
