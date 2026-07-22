/**
 * Biometric authentication flow: onboarding with biometric auth method selection.
 *
 * Run with: yarn wdio ... --suite biometrics
 *
 * The legacy onboarding preamble (incl. biometric-auth) and the card-type config + nickname
 * fragments were removed with the legacy onboarding/verify entry specs. This spec is currently
 * EMPTY and pending its replacement (`journeys/manual/biometrics.journey.ts`, Sauce-only —
 * biometric interception needs `allowTouchIdEnroll`).
 */
