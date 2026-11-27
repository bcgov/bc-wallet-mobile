import BCSCApiClient from '@/bcsc-theme/api/client'

import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isRefreshTokenExpired } from '@/bcsc-theme/state/account/refresh-token'
import { selectVerificationRequestCheck, selectVerificationState } from '@/bcsc-theme/state/verification/selectors'
import {
  VerificationRequestCheck,
  VerificationRequestCheckType,
} from '@/bcsc-theme/state/verification/verification-request-check'
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
import { BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { BifoldLogger, TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getAccount } from 'react-native-bcsc-core'
import { getBundleId } from 'react-native-device-info'
import { SystemCheckStrategy } from '../../services/system-checks/system-checks'
import useConfigApi from '../api/hooks/useConfigApi'
import useTokenApi from '../api/hooks/useTokens'
import { BCSCAccountContext } from '../contexts/BCSCAccountContext'
import { readStoredDeviceRegistration, StoredDeviceRegistration } from '../services/device-registration'
import { useEvidenceService } from '../services/hooks/useEvidenceService'
import { useRegistrationService } from '../services/hooks/useRegistrationService'
import { useTokenService } from '../services/hooks/useTokenService'
import useSecureActions from './useSecureActions'
import { SystemCheckScope } from './useSystemChecks'

const BCSC_BUILD_SUFFIX = '.servicescard'

const updateRegistration = ({
  registrationService,
  selectedNickname,
}: {
  registrationService: ReturnType<typeof useRegistrationService>
  selectedNickname?: string
}) =>
  registrationService.updateRegistration(selectedNickname, {
    // Automatic check: a transient keychain-unavailable failure retries on the
    // next launch (SET_REGISTERED_BUILD only dispatches on success) — no modal.
    suppressTransientAlerts: true,
  })

const rotateKey = async ({
  client,
  logger,
  saveRegistration,
  fallbackRegistrationAccessToken,
}: {
  client: BCSCApiClient
  logger: BifoldLogger
  saveRegistration: ReturnType<typeof useSecureActions>['saveRegistration']
  fallbackRegistrationAccessToken?: string
}): Promise<KeyRotationResult> => {
  // Read fresh, not the store fallback: UpdateDeviceRegistrationSystemCheck's onFail may have rotated it this pass.
  // Both native reads reject (not resolve null) on failure, so each degrades on its own: with no account
  // there is no client ID, and with no readable token the fallback is used.
  const account = await getAccount().catch(() => null)
  const stored = await readStoredDeviceRegistration(account).catch(
    (): StoredDeviceRegistration => ({ clientId: account?.clientID, issuer: account?.issuer })
  )
  const registrationAccessToken = stored.registrationAccessToken ?? fallbackRegistrationAccessToken
  const { clientId, issuer } = stored

  if (!registrationAccessToken || !clientId || !issuer) {
    // Recorded as a failed attempt (not a skip) — this path returns status='failed' below.
    logger.warn(
      'KeyRotationSystemCheck: missing registrationAccessToken or clientID; recording a failed rotation attempt'
    )
    return { status: 'failed' as const, confirmed: false }
  }

  const registration = { clientId, issuer, registrationAccessToken }
  const result = await rotateSigningKey(client, registration, logger)
  if (result.newRegistrationAccessToken) {
    // Syncs the rotated token into the in-memory store; the repeated native write is
    // idempotent and covers the case where rotateSigningKey's own save failed.
    await saveRegistration({ ...registration, registrationAccessToken: result.newRegistrationAccessToken })
  }
  return result
}

type UseGetSystemChecksReturn = Record<
  SystemCheckScope,
  {
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
    /**
     * Set for a scope that runs once per signed-in session rather than once per mounting navigator: the key
     * `SystemCheckSessionProvider` records the run under. A different key is a new batch, run when the
     * navigator next mounts.
     */
    sessionKey?: string
    /**
     * For MAIN_STACK, true for a batch with a request-status check, which flips the Home card (Start/Continue
     * → Verified) once it resolves. MainStack's loading gate holds for such a batch, and on the session's first
     * Home for a verified one, whose id-token checks can deactivate the card; any other resolves after paint.
     */
    decidesHomeCard?: boolean
  }
>

/**
 * The key the session records the main stack's batch under; a different key is a new batch. One per
 * session, one more once the user verifies (the id-token-backed checks only join the batch then), and until
 * then one per verification request, so a request made during the session has its outcome checked on the
 * next Home. A submitted request is named by its ID and a device authorization by its expiry: neither is a
 * secret, unlike the device and user codes.
 *
 * @param isVerified - Whether setup has finished on this device.
 * @param requestCheck - The check that asks IAS for the outcome of an unfinished verification, if any.
 * @returns The session key.
 */
const getMainStackSessionKey = (isVerified: boolean, requestCheck: VerificationRequestCheck): string => {
  if (isVerified) {
    return 'MAIN_STACK:verified'
  }

  switch (requestCheck.type) {
    case VerificationRequestCheckType.RequestStatus:
      return `MAIN_STACK:unverified:${requestCheck.type}:${requestCheck.verificationRequestId}`
    case VerificationRequestCheckType.PendingRecovery:
      return `MAIN_STACK:unverified:${requestCheck.type}:${requestCheck.deviceCodeExpiresAt?.getTime() ?? ''}`
    case VerificationRequestCheckType.None:
      return 'MAIN_STACK:unverified'
  }
}

/**
 * Hook to create system checks to be used by useSystemChecks hook.
 *
 * @see useSystemChecks.tsx
 *
 * @returns Object containing system check getters and readiness for each scope
 */
export const useCreateSystemChecks = (): UseGetSystemChecksReturn => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { client, isClientReady } = useBCSCApiClientState()
  const configApi = useConfigApi(client as BCSCApiClient)
  const evidenceService = useEvidenceService()
  const tokenApi = useTokenApi(client as BCSCApiClient)
  const tokenService = useTokenService()
  const registrationService = useRegistrationService()
  const { saveRegistration } = useSecureActions()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const { isNavigationReady } = useNavigationContainer()
  const accountContext = useContext(BCSCAccountContext)
  const { emitAlert } = useErrorAlert()
  const { clockSkewAlert } = useAlerts()
  const { serverStatus: cachedServerStatus, refresh: refreshServerStatus } = useServerStatus()
  const credentialMetadataRef = useRef(store.bcsc.credentialMetadata)
  const utils = useMemo(() => ({ dispatch, translation: t, logger }), [dispatch, logger, t])
  const registeredThisLaunchRef = useRef(false)

  const defaultReadiness = isNavigationReady && client && isClientReady
  const { isVerified } = selectVerificationState(store)
  const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)
  // Decided once: it picks the main stack's request check, names the batch's session key and says whether
  // the stack waits on the batch
  const requestCheck = useMemo(() => selectVerificationRequestCheck(store), [store])

  useEffect(() => {
    credentialMetadataRef.current = store.bcsc.credentialMetadata
  }, [store.bcsc.credentialMetadata])

  const getStartupSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    const serverStatus = cachedServerStatus ?? (await refreshServerStatus({ force: true })).serverStatus

    const systemChecks: SystemCheckStrategy[] = [
      new InstallIdSystemCheck(store.bcsc.installId, dispatch),
      new AnalyticsSystemCheck(
        store.bcsc.analyticsOptIn,
        store.developer.environment.analyticsAppId,
        Analytics,
        logger
      ),
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
    cachedServerStatus,
    refreshServerStatus,
    client,
    clockSkewAlert,
    dispatch,
    isBCServicesCardBundle,
    logger,
    navigation,
    store.bcsc.analyticsOptIn,
    store.bcsc.installId,
    store.developer.environment.analyticsAppId,
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

  const getMainSystemChecks = useCallback((): SystemCheckStrategy[] => {
    // Guard the native call so a failure here cannot throw away the whole batch
    const getIdToken = () => tokenService.getCachedIdTokenMetadata({ refreshCache: false })

    const systemChecks: SystemCheckStrategy[] = []
    const refreshTokenExpired = isRefreshTokenExpired(store.bcscSecure.refreshToken, new Date())

    // EventReasonAlerts needs the cached id token of any device with a usable refresh token, verified or
    // not; hydration never fetches one when the stored refresh token is expired, so it'd misfire (#4654).
    const shouldRunIdTokenChecks = !!store.bcscSecure.refreshToken && !refreshTokenExpired
    // Needs the user's chosen nickname: without one (e.g. during initial onboarding) the check fails with
    // "No client name found for registration update" on every launch until setup completes.
    const shouldUpdateRegistration =
      isBCServicesCardBundle && !!store.bcscSecure.registrationAccessToken && !!store.bcsc.selectedNickname
    // Key rotation (#3876): gated like the registration update but deliberately skips selectedNickname
    // (rotation doesn't need one).
    const shouldRotateKey = isBCServicesCardBundle && !!store.bcscSecure.registrationAccessToken && isVerified

    if (shouldRunIdTokenChecks) {
      systemChecks.push(
        new EventReasonAlertsSystemCheck(getIdToken, emitAlert, credentialMetadataRef.current, utils, navigation)
      )
    }

    if (isVerified) {
      systemChecks.push(new RefreshTokenExpiredSystemCheck(refreshTokenExpired, navigation, utils))
    }

    // The two request checks below can flip the Home card (Start/Continue → Verified) once they resolve;
    // `decidesHomeCard` tells the stack to wait for a batch that carries one. `getVerificationRequestCheck`
    // decides which of them applies
    if (requestCheck.type === VerificationRequestCheckType.RequestStatus) {
      const { verificationRequestId } = requestCheck
      const { deviceCode, userCode } = store.bcscSecure
      systemChecks.push(
        new VerificationRequestStatusSystemCheck(
          () => evidenceService.getVerificationRequestStatus(verificationRequestId),
          () => {
            if (!deviceCode || !userCode) {
              return Promise.reject(new Error('Missing deviceCode or userCode for verification token exchange'))
            }
            // Token exists, nothing to check
            if (store.bcscSecure.refreshToken) {
              return Promise.resolve(undefined)
            }
            return tokenApi.checkDeviceCodeStatus(deviceCode, userCode)
          },
          utils
        )
      )
    } else if (requestCheck.type === VerificationRequestCheckType.PendingRecovery) {
      const { deviceCode, userCode } = requestCheck
      systemChecks.push(
        new PendingVerificationRecoverySystemCheck(() => {
          // Token exists, nothing to check
          if (store.bcscSecure.refreshToken) {
            return Promise.resolve(true)
          }
          return tokenService.checkVerificationStatus(deviceCode, userCode)
        }, utils)
      )
    }

    // Terms of Use applies to every user (the endpoint is public, no token needed)
    systemChecks.push(
      new TermsOfUseSystemCheck(
        () => configApi.getTermsOfUse(),
        store.bcsc.acceptedTermsOfUseVersion,
        navigation,
        utils
      )
    )

    if (shouldUpdateRegistration) {
      systemChecks.push(
        new UpdateDeviceRegistrationSystemCheck(
          store.bcsc.registeredBuild,
          async () => {
            const response = await updateRegistration({
              registrationService,
              selectedNickname: store.bcsc.selectedNickname,
            })
            registeredThisLaunchRef.current = true
            return response
          },
          utils
        )
      )
    }

    // KeyRotationSystemCheck must stay appended AFTER UpdateDeviceRegistrationSystemCheck so their
    // onFail PUTs never race (sequential order), and so the ref below is settled when it runs.

    if (shouldRotateKey) {
      systemChecks.push(
        new KeyRotationSystemCheck(
          () => registeredThisLaunchRef.current,
          store.bcsc.lastKeyRotationAttemptAt,
          () =>
            rotateKey({
              client: client as BCSCApiClient,
              logger,
              saveRegistration,
              fallbackRegistrationAccessToken: store.bcscSecure.registrationAccessToken,
            }),
          utils
        )
      )
    }

    return systemChecks
  }, [
    isVerified,
    requestCheck,
    store.bcscSecure,
    store.bcsc.acceptedTermsOfUseVersion,
    store.bcsc.selectedNickname,
    store.bcsc.registeredBuild,
    store.bcsc.lastKeyRotationAttemptAt,
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
    saveRegistration,
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
        isReady: Boolean(defaultReadiness && store.stateLoaded),
        isApplicable: true,
      },
      [SystemCheckScope.MAIN_STACK]: {
        getSystemChecks: getMainSystemChecks,
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated && !accountContext?.isLoadingAccount),
        isApplicable: true,
        // A verify ↔ main change within a session doesn't run the batch again, so Home shows at once, unless
        // the user comes back with a verification request the session has not checked yet
        sessionKey: getMainStackSessionKey(isVerified, requestCheck),
        decidesHomeCard: requestCheck.type !== VerificationRequestCheckType.None,
      },
      [SystemCheckScope.VERIFY]: {
        getSystemChecks: getVerifySystemChecks,
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated),
        isApplicable: true,
      },
    }
  }, [
    defaultReadiness,
    getMainSystemChecks,
    getStartupSystemChecks,
    getForegroundSystemChecks,
    store.bcscSecure.isHydrated,
    store.stateLoaded,
    getVerifySystemChecks,
    accountContext?.isLoadingAccount,
    isVerified,
    requestCheck,
  ])
}
