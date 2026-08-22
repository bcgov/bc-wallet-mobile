import BCSCApiClient from '@/bcsc-theme/api/client'

import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { rotateSigningKey } from '@/bcsc-theme/utils/key-rotation'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { useNavigationContainer } from '@/contexts/NavigationContainerContext'
import { AccountExpirySystemCheck } from '@/services/system-checks/AccountExpirySystemCheck'
import { AccountRenewalSystemCheck } from '@/services/system-checks/AccountRenewalSystemCheck'
import { AnalyticsSystemCheck } from '@/services/system-checks/AnalyticsSystemCheck'
import { DeviceCountSystemCheck } from '@/services/system-checks/DeviceCountSystemCheck'
import { EventReasonAlertsSystemCheck } from '@/services/system-checks/EventReasonAlertsSystemCheck'
import { InstallIdSystemCheck } from '@/services/system-checks/InstallIdSystemCheck'
import { KeyRotationSystemCheck } from '@/services/system-checks/KeyRotationSystemCheck'
import { PendingVerificationRecoverySystemCheck } from '@/services/system-checks/PendingVerificationRecoverySystemCheck'
import { ServerClockSkewSystemCheck } from '@/services/system-checks/ServerClockSkewSystemCheck'
import { ServerStatusSystemCheck } from '@/services/system-checks/ServerStatusSystemCheck'
import { TermsOfUseSystemCheck } from '@/services/system-checks/TermsOfUseSystemCheck'
import { UpdateAppSystemCheck } from '@/services/system-checks/UpdateAppSystemCheck'
import { UpdateDeviceRegistrationSystemCheck } from '@/services/system-checks/UpdateDeviceRegistrationSystemCheck'
import { VerificationRequestStatusSystemCheck } from '@/services/system-checks/VerificationRequestStatusSystemCheck'
import {
  getPendingDeviceCodeExpiry,
  VerificationSessionExpiredSystemCheck,
} from '@/services/system-checks/VerificationSessionExpiredSystemCheck'
import { BCDispatchAction, BCState } from '@/store'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getAccount, getMaxDevicesBannerLastDisplayedDate, getToken, TokenType } from 'react-native-bcsc-core'
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

type UseGetSystemChecksReturn = Record<
  SystemCheckScope,
  {
    /**
     * Callback to get system checks for the scope
     * @return Array of system check strategies
     */
    getSystemChecks: () => Promise<SystemCheckStrategy[]>
    /**
     * Indicates if the system checks for the scope are ready to be run
     */
    isReady: boolean
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
  const [store, dispatch] = useStore<BCState>()
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
  const credentialMetadataRef = useRef(store.bcsc.credentialMetadata)
  const utils = useMemo(() => ({ dispatch, translation: t, logger }), [dispatch, logger, t])

  const defaultReadiness = isNavigationReady && client && isClientReady
  const accountExpirationDate = accountContext?.account?.card_expiry
  const isVerified = Boolean(store.bcscSecure.verified)
  const isBCServicesCardBundle = getBundleId().includes(BCSC_BUILD_SUFFIX)
  const verificationRequestId = store.bcscSecure.verificationRequestId

  // update credential metadata ref on store change
  useEffect(() => {
    credentialMetadataRef.current = store.bcsc.credentialMetadata
  }, [store.bcsc.credentialMetadata])

  /**
   * Get system checks to run at app startup
   *
   * @returns Array of system check strategies
   */
  const getStartupSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    // Server status banners are not cleared on startup so they persist across app restarts
    // and remain visible for VPN users who bypass the blocking outage modal.

    const serverStatus = await configApi.getServerStatus()

    const systemChecks: SystemCheckStrategy[] = [
      new InstallIdSystemCheck(store.bcsc.installId, dispatch),
      new AnalyticsSystemCheck(
        store.bcsc.analyticsOptIn,
        store.developer.environment.analyticsAppId,
        Analytics,
        logger
      ),
      new ServerStatusSystemCheck(serverStatus, utils, navigation),
      new ServerClockSkewSystemCheck(serverStatus.serverTimestamp, new Date(), emitAlert, utils),
    ]

    // Only run update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard)
    if (isBCServicesCardBundle) {
      systemChecks.push(new UpdateAppSystemCheck(serverStatus, navigation, utils))
    }

    return systemChecks
  }, [
    configApi,
    dispatch,
    emitAlert,
    isBCServicesCardBundle,
    logger,
    navigation,
    store.bcsc.analyticsOptIn,
    store.bcsc.installId,
    store.developer.environment.analyticsAppId,
    utils,
  ])

  /**
   * Get system checks to run on main stack
   *
   * @returns Array of system check strategies
   */
  const getMainSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    // Guard the native call so a failure here cannot throw away the whole batch
    let dismissedAt: number | undefined
    try {
      dismissedAt = await getMaxDevicesBannerLastDisplayedDate()
    } catch {
      dismissedAt = undefined
    }
    const getIdToken = () => tokenService.getCachedIdTokenMetadata({ refreshCache: false })
    const updateRegistration = () =>
      registrationService.updateRegistration(store.bcscSecure.registrationAccessToken, store.bcsc.selectedNickname, {
        // Automatic check: a transient keychain-unavailable failure retries on the
        // next launch (UPDATE_APP_VERSION only dispatches on success) — no modal.
        suppressTransientAlerts: true,
      })
    const rotateKey = async () => {
      // Read fresh at call time rather than closing over the store value: an earlier check in
      // this same MAIN_STACK pass (UpdateDeviceRegistrationSystemCheck.onFail) may have PUT and
      // rotated the registration_access_token before this check's onFail runs (onFail handlers
      // run sequentially in array order — see runSystemChecks). Fall back to the captured store
      // value only if the native read comes back empty (this check's own gate already required
      // one to exist), never skip outright.
      const [tokenInfo, account] = await Promise.all([getToken(TokenType.Registration), getAccount()])
      const registrationAccessToken = tokenInfo?.token ?? store.bcscSecure.registrationAccessToken
      const clientId = account?.clientID

      if (!registrationAccessToken || !clientId) {
        logger.warn('KeyRotationSystemCheck: missing registrationAccessToken or clientID; skipping rotation attempt')
        return { status: 'failed' as const }
      }

      const result = await rotateSigningKey(client as BCSCApiClient, clientId, registrationAccessToken, logger)
      if (result.newRegistrationAccessToken) {
        // Syncs the rotated token into the in-memory store; the repeated native write is
        // idempotent and covers the case where rotateSigningKey's own setToken failed.
        await updateTokens({ registrationAccessToken: result.newRegistrationAccessToken })
      }
      return result
    }

    const systemChecks: SystemCheckStrategy[] = []

    // DeviceCount and EventReasonAlerts read the cached id token, which only exists
    // for verified users; calling getIdToken without one surfaces a user-facing
    // "token null" error (err 119). Gate them on verification so unverified users
    // still get the account-independent checks (Terms of Use) below.
    if (isVerified) {
      systemChecks.push(new DeviceCountSystemCheck(getIdToken, utils, dismissedAt))
    }

    if (isVerified) {
      systemChecks.push(
        new EventReasonAlertsSystemCheck(getIdToken, emitAlert, credentialMetadataRef.current, utils, navigation)
      )
    }

    if (!isVerified && verificationRequestId) {
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
    } else if (!isVerified && store.bcscSecure.deviceCode && store.bcscSecure.userCode) {
      const { deviceCode, userCode } = store.bcscSecure
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

    // Only run device registration update check for BCSC builds (ie: bundleId ca.bc.gov.id.servicescard).
    // updateRegistration needs both the registration access token and the user's chosen nickname; a fresh or
    // not-yet-verified device has no nickname (and nothing to re-register), so gate on both. Otherwise the
    // check fails with "No client name found for registration update" on every launch until setup completes.
    if (isBCServicesCardBundle && store.bcscSecure.registrationAccessToken && store.bcsc.selectedNickname) {
      systemChecks.push(
        new UpdateDeviceRegistrationSystemCheck(
          store.bcsc.appVersion,
          store.bcsc.appBuildNumber,
          updateRegistration,
          utils
        )
      )
    }

    // Key rotation (issue #3876): gated like the update check above (BCSC builds, an existing
    // registration), but deliberately does NOT require selectedNickname — rotation re-registers
    // the existing key material and doesn't need a nickname. Also requires isVerified: an
    // unverified user is still mid-setup and should never have its keys touched automatically.
    // Appended AFTER UpdateDeviceRegistrationSystemCheck so the two automatic PUTs never race:
    // onFail handlers run sequentially in array order (see runSystemChecks).
    //
    // deferForPendingRegistrationUpdate is deliberately NOT "was UpdateDeviceRegistrationSystemCheck
    // constructed and does IT think it needs an update" — that check's own signal
    // (store.bcsc.appVersion/appBuildNumber) only advances on a SUCCESSFUL PUT, so a persistently
    // failing PUT (or a user for whom that check is never even constructed, e.g. no
    // selectedNickname yet) would make that signal permanently stale and latch key rotation off
    // forever (see the #3876 review that caught this — the original implementation read those
    // same store fields directly, with the identical bug). Instead this is a TRUE per-launch
    // marker, stamped unconditionally every launch via RECORD_APP_LAUNCH_VERSION below,
    // independent of whether registration itself ever succeeds.
    const appVersionChangedSinceLastLaunch =
      store.bcsc.lastSeenAppVersion !== getVersion() || store.bcsc.lastSeenAppBuildNumber !== getBuildNumber()

    if (isBCServicesCardBundle && store.bcscSecure.registrationAccessToken && isVerified) {
      systemChecks.push(
        new KeyRotationSystemCheck(
          appVersionChangedSinceLastLaunch,
          store.bcsc.lastKeyRotationAttemptAt,
          rotateKey,
          utils
        )
      )
    }

    // Stamp the per-launch version/build marker unconditionally, AFTER computing
    // appVersionChangedSinceLastLaunch above (which needs the PREVIOUS launch's value) — this
    // getMainSystemChecks callback runs exactly once per app session (guarded by
    // useSystemChecks' ranSystemChecksRef), so dispatching here fires once per launch, not once
    // per render.
    if (appVersionChangedSinceLastLaunch) {
      dispatch({
        type: BCDispatchAction.RECORD_APP_LAUNCH_VERSION,
        payload: [{ version: getVersion(), buildNumber: getBuildNumber() }],
      })
    }

    return systemChecks
  }, [
    isVerified,
    verificationRequestId,
    store.bcscSecure,
    store.bcsc.acceptedTermsOfUseVersion,
    store.bcsc.selectedNickname,
    store.bcsc.appVersion,
    store.bcsc.appBuildNumber,
    store.bcsc.lastKeyRotationAttemptAt,
    store.bcsc.lastSeenAppVersion,
    store.bcsc.lastSeenAppBuildNumber,
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
    dispatch,
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

  const getAccountSystemChecks = useCallback(async (): Promise<SystemCheckStrategy[]> => {
    let checks: SystemCheckStrategy[] = []

    if (accountExpirationDate) {
      checks = [
        new AccountExpirySystemCheck(accountExpirationDate, utils),
        new AccountRenewalSystemCheck(accountExpirationDate, utils),
      ]
    }
    return checks
  }, [accountExpirationDate, utils])

  return useMemo(() => {
    return {
      [SystemCheckScope.STARTUP]: {
        getSystemChecks: getStartupSystemChecks,
        isReady: Boolean(defaultReadiness && store.stateLoaded),
      },
      [SystemCheckScope.MAIN_STACK]: {
        getSystemChecks: getMainSystemChecks,
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated),
      },
      [SystemCheckScope.VERIFY]: {
        getSystemChecks: getVerifySystemChecks,
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated),
      },
      [SystemCheckScope.ACCOUNT]: {
        getSystemChecks: getAccountSystemChecks,
        isReady: Boolean(defaultReadiness && store.bcscSecure.isHydrated && !!accountContext?.account),
      },
    }
  }, [
    defaultReadiness,
    getMainSystemChecks,
    getStartupSystemChecks,
    store.bcscSecure.isHydrated,
    store.stateLoaded,
    getVerifySystemChecks,
    getAccountSystemChecks,
    accountContext?.account,
  ])
}
