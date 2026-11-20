import BCSCApiClient from '@/bcsc-theme/api/client'
import {
  getBCSCState,
  useAccount,
  useApp,
  useDeveloper,
  useNickname,
  useSession,
  useVerification,
} from '@/bcsc-theme/storage/hooks'

import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
import { useVerificationState } from '@/bcsc-theme/state/verification/useVerificationState'
import { KeyRotationResult, rotateSigningKey } from '@/bcsc-theme/utils/key-rotation'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { useAlerts } from '@/hooks/useAlerts'
import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { InstallIdSystemCheck } from '@/services/system-checks/InstallIdSystemCheck'
import { KeyRotationSystemCheck } from '@/services/system-checks/KeyRotationSystemCheck'
import { PendingVerificationRecoverySystemCheck } from '@/services/system-checks/PendingVerificationRecoverySystemCheck'
import { RefreshTokenExpiredSystemCheck } from '@/services/system-checks/RefreshTokenExpiredSystemCheck'
import { ServerClockSkewSystemCheck } from '@/services/system-checks/ServerClockSkewSystemCheck'
import { TermsOfUseSystemCheck } from '@/services/system-checks/TermsOfUseSystemCheck'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { VerificationRequestStatusSystemCheck } from '@/services/system-checks/VerificationRequestStatusSystemCheck'
import {
  getPendingDeviceCodeExpiry,
  VerificationSessionExpiredSystemCheck,
} from '@/services/system-checks/VerificationSessionExpiredSystemCheck'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { BifoldLogger, TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { getBuildNumber, getBundleId, getVersion } from 'react-native-device-info'
import { SystemCheckStrategy } from '../../services/system-checks/system-checks'
import useConfigApi from '../api/hooks/useConfigApi'
import useTokenApi from '../api/hooks/useTokens'
import { BCSCAccountContext } from '../contexts/BCSCAccountContext'
import { useEvidenceService } from '../services/hooks/useEvidenceService'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useTokenService } from '../services/hooks/useTokenService'
import useSecureActions from './useSecureActions'
import { SystemCheckScope } from './useSystemChecks'

const BCSC_BUILD_SUFFIX = '.servicescard'

const updateRegistration = ({
  registrationService,
  registrationAccessToken,
  selectedNickname,
}: {
  registrationService: ReturnType<typeof useRegistrationService>
  registrationAccessToken?: string
  selectedNickname?: string
}) =>
  registrationService.updateRegistration(registrationAccessToken, selectedNickname, {
    // Automatic check: a transient keychain-unavailable failure retries on the
    // next launch (UPDATE_APP_VERSION only dispatches on success) — no modal.
    suppressTransientAlerts: true,
  })

const rotateKey = async ({
  client,
  logger,
  updateTokens,
  fallbackRegistrationAccessToken,
}: {
  client: BCSCApiClient
  logger: BifoldLogger
  updateTokens: ReturnType<typeof useSecureActions>['updateTokens']
  fallbackRegistrationAccessToken?: string
}): Promise<KeyRotationResult> => {
  // Read fresh, not the render's fallback: UpdateDeviceRegistrationSystemCheck's onFail may have rotated it this pass
  const { tokens, profile } = getBCSCState().account
  const registrationAccessToken = tokens?.registrationAccessToken ?? fallbackRegistrationAccessToken
  const clientId = profile?.clientId

  if (!registrationAccessToken || !clientId) {
    // Recorded as a failed attempt (not a skip) — this path returns status='failed' below.
    logger.warn(
      'KeyRotationSystemCheck: missing registrationAccessToken or clientID; recording a failed rotation attempt'
    )
    return { status: 'failed' as const, confirmed: false }
  }

  const result = await rotateSigningKey(client, clientId, registrationAccessToken, logger)
  if (result.newRegistrationAccessToken) {
    // Covers the case where rotateSigningKey's own save failed: updateTokens keeps it in memory at least
    await updateTokens({ registrationAccessToken: result.newRegistrationAccessToken })
  }
  return result
}

type UseGetSystemChecksReturn = Record<
  SystemCheckScope,
  {
    /**
     * Callback to get system checks for the scope
     * @return Array of system check strategies
     */
    getSystemChecks: () => Promise<SystemCheckStrategy[]> | SystemCheckStrategy[]
    /**
     * Callback to get the checks to run again each time the app returns to the foreground
     */
    getForegroundSystemChecks?: () => Promise<SystemCheckStrategy[]>
    /**
     * Indicates if the system checks for the scope are ready to be run
     */
    isReady: boolean
    /**
     * Indicates if the scope will ever run in the current app state. False means callers waiting on
     * the scope (see the loading gate in MainStack) should stop waiting — `isReady` will never flip.
     */
    isApplicable: boolean
  }
>

/**
 * Hook to create system checks to be used by useSystemChecks hook.
 *
 * @see useSystemChecks.tsx
 *
 * @returns Object containing system check getters and readiness for each scope
 */
export const useCreateSystemChecks = (): UseGetSystemChecksReturn => {
  const { t } = useTranslation()
  const app = useApp()
  const credentialMetadata = useAccount((a) => a.credentialMetadata)
  const tokens = useAccount((a) => a.tokens)
  const selectedNickname = useNickname()
  const { stateLoaded, isHydrated } = useSession(
    useShallow((s) => ({ stateLoaded: s.stateLoaded, isHydrated: s.isHydrated }))
  )
  const { verificationRequestId, deviceCode, userCode } = useVerification(
    useShallow((v) => ({
      verificationRequestId: v.request?.backCheckVerificationId,
      deviceCode: v.request?.deviceCode,
      userCode: v.request?.userCode,
    }))
  )
  const developer = useDeveloper()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const evidenceService = useEvidenceService()
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const tokenService = useTokenService()
  const registrationService = useRegistrationService()
  const { updateTokens } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const { isNavigationReady } = useNavigationContainer()
  const accountContext = useContext(BCSCAccountContext)
  const { emitAlert } = useErrorAlert()
  const { clockSkewAlert } = useAlerts()
  const { serverStatus: cachedServerStatus, refresh: refreshServerStatus } = useServerStatus()
  const credentialMetadataRef = useRef(credentialMetadata)
  const utils = useMemo(() => ({ translation: t, logger }), [logger, t])
  const appVersion = getVersion()
  const appBuildNumber = getBuildNumber()
  const appVersionChangedSinceLastLaunchRef = useRef<boolean | null>(null)
  const launchVersionRecordedRef = useRef(false)

  const defaultReadiness = isNavigationReady && client && isClientReady
  const { isVerified } = useVerificationState()
  const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)

  // update credential metadata ref on store change
  useEffect(() => {
    credentialMetadataRef.current = credentialMetadata
  }, [credentialMetadata])

  /**
   * Get system checks to run at app startup
   *
   * @returns Array of system check strategies
   */
  const getStartupSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    const serverStatus = cachedServerStatus ?? (await refreshServerStatus({ force: true })).serverStatus

    const systemChecks: SystemCheckStrategy[] = [
      new InstallIdSystemCheck(app.installId, (installId) => app.update({ installId })),
      new AnalyticsSystemCheck(app.analyticsOptIn, developer.environment.analyticsAppId, Analytics, logger),
    ]

    // Clock-skew and update checks both need the status fetch (it records the server's time on the
    // client); skip them (rather than aborting the whole batch) if it failed.
    if (serverStatus) {
      if (client) {
        systemChecks.push(new ServerClockSkewSystemCheck(client, clockSkewAlert, utils))
      }

      // Only run update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
      if (isBCServicesCardBundle) {
        systemChecks.push(new UpdateAppSystemCheck(serverStatus, navigation, utils))
      }
    }

    return systemChecks
  }, [
    app,
    cachedServerStatus,
    refreshServerStatus,
    client,
    clockSkewAlert,
    isBCServicesCardBundle,
    logger,
    navigation,
    developer.environment.analyticsAppId,
    utils,
  ])

  /**
   * Get system checks to run again each time the app returns to the foreground
   *
   * @returns Array of system check strategies
   */
  const getForegroundSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    // The user may have changed the clock while away. Joins the status fetch ServerStatusProvider
    // starts on foreground, which records a fresh server time on the client.
    await refreshServerStatus({ force: true })

    return client ? [new ServerClockSkewSystemCheck(client, clockSkewAlert, utils)] : []
  }, [client, clockSkewAlert, refreshServerStatus, utils])

  /**
   * Get system checks to run on main stack
   *
   * @returns Array of system check strategies
   */
  const getMainSystemChecks = useCallback((): SystemCheckStrategy[] => {
    // Guard the native call so a failure here cannot throw away the whole batch
    const getIdToken = () => tokenService.getCachedIdTokenMetadata({ refreshCache: false })

    const systemChecks: SystemCheckStrategy[] = []
    const refreshTokenExpired = isRefreshTokenExpired(tokens?.refreshToken, new Date())

    // DeviceCount and EventReasonAlerts need a verified user's cached id token; hydration never
    // fetches one when the stored refresh token is expired, so they'd misfire on that path (#4654).
    const shouldRunIdTokenChecks = isVerified && !refreshTokenExpired
    // `!!` (not `Boolean()`) keeps TS narrowing in the branches; the `else if` below keeps the two exclusive.
    const shouldCheckVerificationRequest = !isVerified && !!verificationRequestId
    const shouldRecoverPendingVerification = !isVerified && !!deviceCode && !!userCode
    // Needs the user's chosen nickname: without one (e.g. during initial onboarding) the check fails with
    // "No client name found for registration update" on every launch until setup completes.
    const shouldUpdateRegistration =
      isBCServicesCardBundle && !!tokens?.registrationAccessToken && !!selectedNickname
    // Key rotation (#3876): gated like the registration update but deliberately skips selectedNickname
    // (rotation doesn't need one).
    const shouldRotateKey = isBCServicesCardBundle && !!tokens?.registrationAccessToken && isVerified

    if (shouldRunIdTokenChecks) {
      systemChecks.push(
        new EventReasonAlertsSystemCheck(getIdToken, emitAlert, credentialMetadataRef.current, utils, navigation)
      )
    }

    if (isVerified) {
      systemChecks.push(new RefreshTokenExpiredSystemCheck(refreshTokenExpired, navigation, utils))
    }

    if (shouldCheckVerificationRequest) {
      systemChecks.push(
        new VerificationRequestStatusSystemCheck(
          () => evidenceService.getVerificationRequestStatus(verificationRequestId),
          () => {
            if (!deviceCode || !userCode) {
              return Promise.reject(new Error('Missing deviceCode or userCode for verification token exchange'))
            }
            // Token exists, nothing to check
            if (tokens?.refreshToken) {
              return Promise.resolve(undefined)
            }
            return tokenApi.checkDeviceCodeStatus(deviceCode, userCode)
          },
          utils
        )
      )
    } else if (shouldRecoverPendingVerification) {
      systemChecks.push(
        new PendingVerificationRecoverySystemCheck(() => {
          // Token exists, nothing to check
          if (tokens?.refreshToken) {
            return Promise.resolve(true)
          }
          return tokenService.checkVerificationStatus(deviceCode, userCode)
        }, utils)
      )
    }

    // Terms of Use applies to every user (the endpoint is public, no token needed)
    systemChecks.push(
      new TermsOfUseSystemCheck(() => configApi.getTermsOfUse(), app.acceptedTermsOfUseVersion, navigation, utils)
    )

    if (shouldUpdateRegistration) {
      systemChecks.push(
        new UpdateDeviceRegistrationSystemCheck(
          app.appVersion,
          app.appBuildNumber,
          () =>
            updateRegistration({
              registrationService,
              registrationAccessToken: tokens?.registrationAccessToken,
              selectedNickname,
            }),
          utils
        )
      )
    }

    // KeyRotationSystemCheck must stay appended AFTER UpdateDeviceRegistrationSystemCheck so their
    // onFail PUTs never race (sequential order).
    appVersionChangedSinceLastLaunchRef.current ??=
      app.lastSeenAppVersion !== appVersion || app.lastSeenAppBuildNumber !== appBuildNumber
    const appVersionChangedSinceLastLaunch = appVersionChangedSinceLastLaunchRef.current

    if (shouldRotateKey) {
      systemChecks.push(
        new KeyRotationSystemCheck(
          appVersionChangedSinceLastLaunch,
          app.lastKeyRotationAttemptAt,
          () =>
            rotateKey({
              client: client as BCSCApiClient,
              logger,
              updateTokens,
              fallbackRegistrationAccessToken: tokens?.registrationAccessToken,
            }),
          utils
        )
      )
    }

    // Defensive only: useSystemChecks calls getSystemChecks once per mount, but the ref keeps the
    // deferral from flipping off if a future caller invokes it again after this dispatch lands.
    if (appVersionChangedSinceLastLaunch && !launchVersionRecordedRef.current) {
      launchVersionRecordedRef.current = true
      void getBCSCState().app.update({ lastSeenAppVersion: appVersion, lastSeenAppBuildNumber: appBuildNumber })
    }

    return systemChecks
  }, [
    isVerified,
    verificationRequestId,
    deviceCode,
    userCode,
    tokens,
    app.acceptedTermsOfUseVersion,
    selectedNickname,
    app.appVersion,
    app.appBuildNumber,
    app.lastKeyRotationAttemptAt,
    app.lastSeenAppVersion,
    app.lastSeenAppBuildNumber,
    appVersion,
    appBuildNumber,
    navigation,
    utils,
    isBCServicesCardBundle,
    tokenService,
    registrationService,
    emitAlert,
    evidenceService,
    tokenApi,
    configApi,
    client,
    logger,
    updateTokens,
  ])

  /**
   * Get system checks to run within the verification flow (VerifyStack).
   *
   * VerifyStack is only mounted for an unverified, authenticated user once secure state is hydrated,
   * so the expired-session check runs in the right place (never on the auth/main stacks) and needs no
   * verified-status gating. See issue #4050.
   *
   * @returns Array of system check strategies
   */
  const getVerifySystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    return [new VerificationSessionExpiredSystemCheck(getPendingDeviceCodeExpiry, navigation, utils)]
  }, [navigation, utils])

  return useMemo(() => {
    return {
      [SystemCheckScope.STARTUP]: {
        getSystemChecks: getStartupSystemChecks,
        getForegroundSystemChecks,
        isReady: Boolean(defaultReadiness && stateLoaded),
        isApplicable: true,
      },
      [SystemCheckScope.MAIN_STACK]: {
        getSystemChecks: getMainSystemChecks,
        isReady: Boolean(defaultReadiness && isHydrated && !accountContext?.isLoadingAccount),
        isApplicable: true,
      },
      [SystemCheckScope.VERIFY]: {
        getSystemChecks: getVerifySystemChecks,
        isReady: Boolean(defaultReadiness && isHydrated),
        isApplicable: true,
      },
    }
  }, [
    defaultReadiness,
    getMainSystemChecks,
    getStartupSystemChecks,
    getForegroundSystemChecks,
    isHydrated,
    stateLoaded,
    getVerifySystemChecks,
    accountContext?.isLoadingAccount,
  ])
}
