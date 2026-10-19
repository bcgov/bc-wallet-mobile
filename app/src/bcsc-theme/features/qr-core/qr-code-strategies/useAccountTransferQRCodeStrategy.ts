import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { useDeviceAuthorizationRecovery } from '@/bcsc-theme/hooks/useDeviceAuthorizationRecovery'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { toAppError } from '@/bcsc-theme/utils/native-error-map'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { ErrorRegistry } from '@/errors'
import { isAppError, isHandledAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useRoute } from '@react-navigation/native'
import { useCallback, useMemo, useRef } from 'react'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import { QRCodeStrategy } from '../useQRScanner'

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
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { deviceAttestation, authorization, token } = useApi()
  const apiClient = useBCSCApiClient()
  const { updateTokens, updateUserInfo, updateDeviceCodes } = useSecureActions()
  const [store] = useStore<BCState>()
  // Shared by several scanner screens, so the origin screen for recovery is whichever one renders this hook
  const route = useRoute()
  const attemptWithRecovery = useDeviceAuthorizationRecovery()
  const deviceCodeRef = useRef<string | undefined>(store.bcscSecure.deviceCode)

  const step = useRef('accountTransfer')

  const updateStep = (newStep: string) => (step.current = newStep)

  const registerDevice = useCallback(async () => {
    // we already have a device code, no need to authorize again
    if (store.bcscSecure.deviceCode) {
      deviceCodeRef.current = store.bcscSecure.deviceCode
      return
    }

    updateStep('deviceAuthorization')
    const deviceAuth = await attemptWithRecovery(() => authorization.authorizeDevice(), route.name)

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
  }, [store.bcscSecure.deviceCode, attemptWithRecovery, authorization, route.name, updateDeviceCodes, updateUserInfo])

  const transferAccount = useCallback(
    async (transferToken: string) => {
      updateStep('getAccount')
      const account = await getAccount()

      if (!account) {
        throw toAppError(new Error('Account not found'), ErrorRegistry.ACCOUNT_TRANSFER_ERROR)
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
        throw toAppError(new Error('Device code not found'), ErrorRegistry.ACCOUNT_TRANSFER_ERROR)
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
        throw toAppError(new Error('Attestation was not accepted'), ErrorRegistry.ACCOUNT_TRANSFER_ERROR)
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

  const matches = useCallback((uri: string): boolean => {
    return extractTransferToken(uri) !== null
  }, [])

  const handle = useCallback(
    async (uri: string): Promise<void> => {
      try {
        updateStep('extractTransferToken')
        const transferToken = extractTransferToken(uri)

        if (!transferToken) {
          logger.warn('[useAccountTransferQRCodeStrategy] matched but failed to extract transferToken')
          throw toAppError(new Error('Unable to extract transfer token from uri'), ErrorRegistry.ACCOUNT_TRANSFER_ERROR)
        }

        if (store.bcscSecure.verified && onAlreadyVerified) {
          updateStep('alreadyVerified')
          onAlreadyVerified()
          return
        }

        step.current = 'registerDevice'
        await registerDevice()

        step.current = 'transferAccount'
        await transferAccount(transferToken)

        updateStep('success')
        onSuccess()
      } catch (error) {
        if (isHandledAppError(error)) {
          return
        }

        // Use the app error if it is already an account transfer QR code failure
        const appError = isAppError(error, AppEventCode.ACCOUNT_TRANSFER_ERROR)
          ? error
          : toAppError(error, ErrorRegistry.ACCOUNT_TRANSFER_ERROR)

        appError.addContext({ accountTransferFailedStep: step.current })

        throw appError
      }
    },
    [logger, onAlreadyVerified, onSuccess, registerDevice, store.bcscSecure.verified, transferAccount]
  )

  return useMemo(() => ({ matches, handle }), [matches, handle])
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
