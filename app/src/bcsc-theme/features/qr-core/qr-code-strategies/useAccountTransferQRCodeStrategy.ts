import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useDeviceAuthorizationRecovery } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationState } from '@/bcsc-theme/state/verification/useVerificationState'
import { getBCSCState, selectAccountRecord, useVerification } from '@/bcsc-theme/storage/hooks'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TOKENS, useServices } from '@bifold/core'
import { useRoute } from '@react-navigation/native'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createDeviceSignedJWT, isAccountRegistered } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import { QRCodeStrategy, QRError } from '../useQRScanner'

const TRANSFER_QR_PATH = /selfsetup\.html$/i

/**
 * Creates a QRCodeStrategy for handling account transfer QR codes.
 */
export const useAccountTransferQRCodeStrategy = (
  /**
   * Callback function to be called when the account transfer is successful.
   * ie: Navigate to the "Verification Success" screen.
   * @returns void
   */
  onSuccess: () => void,
  /**
   * Callback function to be called when the account is already verified.
   * ie: Navigate to the "Already Verified" screen
   * @returns void
   */
  onAlreadyVerified?: () => void
): QRCodeStrategy => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { deviceAttestation, authorization, token } = useApi()
  const apiClient = useBCSCApiClient()
  const { updateTokens, updateUserInfo, updateDeviceCodes } = useSecureActions()
  const { request } = useVerification()
  const deviceCode = request?.deviceCode
  const { isVerified } = useVerificationState()
  // Shared by several scanner screens, so the origin screen for recovery is whichever one renders this hook
  const route = useRoute()
  const attemptWithRecovery = useDeviceAuthorizationRecovery()
  const deviceCodeRef = useRef<string | undefined>(deviceCode)
  const registeredDuringScan = useRef(false)
  const step = useRef('initAccountTransfer') // Tracks the current step of the account transfer process for error reporting
  const updateStep = (newStep: string) => (step.current = newStep)

  /**
   * Registers the device with the BCSC authorization service if it hasn't been registered yet.
   * @returns A promise that resolves when the device registration is complete.
   */
  const registerDevice = useCallback(async () => {
    // we already have a device code, no need to authorize again
    if (deviceCode) {
      deviceCodeRef.current = deviceCode
      return
    }

    updateStep('deviceAuthorization')
    const deviceAuth = await attemptWithRecovery(() => authorization.authorizeDevice(), route.name)
    registeredDuringScan.current = true

    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)

    updateStep('updateUserInfo')
    await updateUserInfo({
      email: deviceAuth.verified_email || BCSC_EMAIL_NOT_PROVIDED,
      isEmailVerified: !!deviceAuth.verified_email,
    })

    updateStep('updateDeviceCodes')
    await updateDeviceCodes({
      deviceCode: deviceAuth.device_code,
      userCode: deviceAuth.user_code,
      deviceCodeExpiresAt: expiresAt,
    })

    deviceCodeRef.current = deviceAuth.device_code
  }, [deviceCode, attemptWithRecovery, authorization, route.name, updateDeviceCodes, updateUserInfo])

  /**
   * Transfers the account to the new device using the provided transfer token.
   * @param transferToken - The transfer token extracted from the QR code.
   * @returns A promise that resolves when the account transfer is complete.
   */
  const transferAccount = useCallback(
    async (transferToken: string) => {
      updateStep('getAccount')
      const account = selectAccountRecord(getBCSCState())

      if (!account) {
        throw new QRError('Local account not found')
      }

      // The transfer is requested as this device's client, so the account needs its registration
      if (!isAccountRegistered(account)) {
        throw new QRError('Local account is not registered')
      }

      // ias tokens expect times in seconds since epoch
      const timeInSeconds = Math.floor(Date.now() / 1000)

      updateStep('createDeviceSignedJWT')
      const newDeviceJWT = await createDeviceSignedJWT({
        aud: account.issuer,
        iss: account.clientID,
        sub: account.clientID,
        iat: timeInSeconds,
        exp: timeInSeconds + 60, // give this token 1 minute to live
        jti: uuid.v4().toString(),
      })

      updateStep('getDeviceCode')
      const deviceCode = deviceCodeRef.current
      if (!deviceCode) {
        throw new QRError('Device code not found')
      }

      // Attest: verify the new device
      updateStep('verifyAttestation')
      const response = await deviceAttestation.verifyAttestation({
        client_id: account.clientID,
        device_code: deviceCode,
        attestation: transferToken,
        client_assertion: newDeviceJWT,
      })

      if (!response) {
        throw new QRError('Attestation was not accepted')
      }

      // fetch tokens for the new device
      updateStep('getDeviceToken')
      const deviceToken = await token.deviceToken({
        client_id: account.clientID,
        device_code: deviceCode,
        client_assertion: newDeviceJWT,
      })

      apiClient.tokens = deviceToken

      updateStep('updateTokens')
      await updateTokens({ refreshToken: deviceToken.refresh_token, accessToken: deviceToken.access_token })
    },
    [deviceAttestation, token, apiClient, updateTokens]
  )

  /**
   * Checks if the given URI matches the account transfer QR code pattern.
   * @param uri - The URI to check.
   * @returns True if the URI matches the account transfer QR code pattern, false otherwise.
   */
  const matches = useCallback((uri: string): boolean => {
    return extractTransferToken(uri) !== null
  }, [])

  /**
   * Handles the account transfer process when a matching QR code is scanned.
   * @param uri - The URI extracted from the scanned QR code.
   * @returns A promise that resolves when the account transfer process is complete.
   */
  const handle = useCallback(
    async (uri: string): Promise<void> => {
      updateStep('startAccountTransfer')

      const transferToken = extractTransferToken(uri)
      if (!transferToken) {
        logger.warn('[useAccountTransferQRCodeStrategy] matched but failed to extract transferToken')
        throw new QRError('Unable to extract transfer token from uri')
      }

      if (isVerified && onAlreadyVerified) {
        updateStep('alreadyVerified')
        onAlreadyVerified()
        return
      }

      updateStep('registerDevice')
      await registerDevice()

      updateStep('transferAccount')
      await transferAccount(transferToken)

      updateStep('accountTransferSuccess')
      onSuccess()
    },
    [logger, onAlreadyVerified, onSuccess, registerDevice, isVerified, transferAccount]
  )

  /**
   * Handles errors that occur during the account transfer process.
   * @param error - The error that occurred during the account transfer process.
   * @returns An object containing the error, title, and description for displaying in an error modal.
   */
  const toErrorModal = useCallback(
    (error: unknown) => {
      const appError = ensureAppError(error, AppEventCode.ACCOUNT_TRANSFER_ERROR)

      appError.addContext({
        accountTransferFailedDuring: step.current,
        accountTransferRegisteredAccountDuringScan: registeredDuringScan.current,
      })

      logger.error('[useAccountTransferQRCodeStrategy] Error during account transfer', appError)

      if (isHandledAppError(error)) {
        logger.debug('[useAccountTransferQRCodeStrategy] Account transfer error previously handled')
        return null
      }

      return {
        error: appError,
        title: t('BCSC.Scan.AccountTransferErrorTitle'),
        description: t('BCSC.Scan.AccountTransferErrorDescription'),
      }
    },
    [logger, t]
  )

  return useMemo(() => ({ matches, handle, toErrorModal }), [matches, handle, toErrorModal])
}

export const extractTransferToken = (uri: string): string | null => {
  try {
    const url = new URL(uri)
    if (!TRANSFER_QR_PATH.test(url.pathname)) {
      return null
    }
    const transferToken = url.search.startsWith('?') ? url.search.slice(1) : url.search
    return transferToken || null
  } catch {
    return null
  }
}
