import type { BCState } from '@/store'
import {
  selectBirthdate,
  selectDeviceCodeExpiresAt,
  selectEmailAddress,
  selectHasAccount,
  selectNickname,
  selectSessionRecoveryRequired,
  selectVerificationOptions,
  selectVerified,
} from './hooks'
import type { BCSCStore } from './slices'

// Converted once per value, so a field keeps its identity across renders while the stored value is unchanged
const isoDates = new Map<string, Date>()
const isoDate = (iso: string | undefined) => {
  if (!iso) {
    return undefined
  }
  if (!isoDates.has(iso)) {
    isoDates.set(iso, new Date(iso))
  }
  return isoDates.get(iso)
}
const NO_EVIDENCE: BCState['bcscSecure']['additionalEvidenceData'] = []

// Bifold's state with every field that has moved to the BCSC store read from there instead, for BifoldStoreView:
// Bifold's own screens and the shared app code still read a BCState. BCSC code reads the slices (see ./hooks).
export const overlayBCSCState = (bifold: BCState, s: BCSCStore): BCState => {
  const { app, preferences, developer, contacts, session, savedServices, account, verification } = s
  return {
    ...bifold,
    stateLoaded: session.stateLoaded || bifold.stateLoaded,
    authentication: { ...bifold.authentication, didAuthenticate: session.didAuthenticate },
    preferences: {
      ...bifold.preferences,
      autoLockTime: preferences.autoLockTime,
      developerModeEnabled: preferences.developerModeEnabled,
      usePushNotifications: preferences.usePushNotifications,
      selectedMediator: preferences.selectedMediator,
      availableMediators: preferences.availableMediators,
      proofRequestExpirationMs: preferences.proofRequestExpirationMs,
      walletName: preferences.walletName ?? bifold.preferences?.walletName,
      alternateContactNames: contacts.alternateNames,
    },
    developer: {
      ...bifold.developer,
      environment: developer.environment,
      enableProxy: developer.enableProxy,
      enableAppToAppPersonFlow: developer.enableAppToAppPersonFlow,
      enableAttestation: developer.enableAttestation,
      remoteDebugging: {
        enabledAt: isoDate(developer.remoteDebugging.enabledAt),
        sessionId: developer.remoteDebugging.sessionId,
      },
    },
    bcsc: {
      ...bifold.bcsc,
      installId: app.installId,
      appBuildHistory: app.appBuildHistory,
      registeredBuild: app.registeredBuild,
      lastKeyRotationAttemptAt: app.lastKeyRotationAttemptAt,
      analyticsOptIn: app.analyticsOptIn,
      acceptedTermsOfUseVersion: app.acceptedTermsOfUseVersion,
      hasSeenOnboardingIntro: app.hasSeenOnboardingIntro,
      hasDismissedThirdPartyKeyboardAlert: app.hasDismissedThirdPartyKeyboardAlert,
      hasDismissedDeviceAuthInfo: app.hasDismissedDeviceAuthInfo,
      verificationSkipped: app.verificationSkipped,
      verificationStarted: app.verificationStarted,
      dismissedBanners: app.dismissedBanners as BCState['bcsc']['dismissedBanners'],
      accountSetupType: app.accountSetupType as BCState['bcsc']['accountSetupType'],
      hasAccount: selectHasAccount(s),
      selectedNickname: selectNickname(s),
      credentialMetadata: account.credentialMetadata,
      photoPath: session.photoPath,
      photoMetadata: session.photoMetadata,
      videoPath: session.videoPath,
      videoThumbnailPath: session.videoThumbnailPath,
      videoDuration: session.videoDuration,
      prompts: session.prompts,
    },
    bcscSecure: {
      ...bifold.bcscSecure,
      walletKey: session.walletKey,
      userMetadata: session.userMetadata,
      residentialAddressDraft: session.residentialAddressDraft,
      inVerifyFlow: session.inVerifyFlow,
      credentialDeactivated: session.credentialDeactivated,
      verificationRequestSha: session.verificationRequestSha,
      verificationRequestStatus: session.verificationRequestStatus,
      verificationRequestStatusMessage: session.verificationRequestStatusMessage,
      verificationVideoSubmittedAt: session.verificationVideoSubmittedAt,
      savedServices: savedServices.ids,
      cardProcess: verification.cardProcess,
      securityMethod: account.profile?.securityMethod,
      // As hydrate worked it out: a credential record for a card that isn't cancelled or expired
      verified: selectVerified(s),
      sessionRecoveryRequired: selectSessionRecoveryRequired(s),
      isHydrated: session.isHydrated,
      serial: verification.request?.csn,
      birthdate: selectBirthdate(s),
      deviceCode: verification.request?.deviceCode,
      userCode: verification.request?.userCode,
      deviceCodeExpiresAt: selectDeviceCodeExpiresAt(s),
      verificationOptions: selectVerificationOptions(s),
      verificationRequestId: verification.request?.backCheckVerificationId,
      // The flag as last set wins (entering a new email clears it); the request's verifiedEmail covers records
      // from before the flag was kept (v3)
      isEmailVerified: verification.flags?.isEmailVerified ?? (verification.request?.verifiedEmail ? true : undefined),
      emailAddress: selectEmailAddress(s),
      userSkippedEmailVerification: verification.flags?.userSkippedEmailVerification,
      temporaryEmailId: verification.flags?.temporaryEmailId,
      userSubmittedVerificationVideo: verification.flags?.userSubmittedVerificationVideo,
      additionalEvidenceData: verification.evidence ?? NO_EVIDENCE,
      refreshToken: account.tokens?.refreshToken,
      registrationAccessToken: account.tokens?.registrationAccessToken,
      accessToken: account.tokens?.accessToken,
    },
  }
}
