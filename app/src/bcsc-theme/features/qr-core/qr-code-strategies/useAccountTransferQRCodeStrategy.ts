import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import { BCState } from '@/store'
import { QrCodeScanError, TOKENS, useServices, useStore } from '@bifold/core'
import { useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import { QRCodeStrategy } from '../useQRScanner'

const TRANSFER_QR_PATH = /selfsetup\.html$/i

/**
 * Creates a QRCodeStrategy for handling account transfer QR codes.
 */
export const useAccountTransferQRCodeStrategy = (onSuccess: () => void): QRCodeStrategy => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { deviceAttestation, authorization, token } = useApi()
  const apiClient = useBCSCApiClient()
  const { updateTokens, updateUserInfo, updateDeviceCodes } = useSecureActions()
  const [store] = useStore<BCState>()
  const deviceCodeRef = useRef<string | undefined>(store.bcscSecure.deviceCode)

  const registerDevice = useCallback(async () => {
    // we already have a device code, no need to authorize again
    if (store.bcscSecure.deviceCode) {
      deviceCodeRef.current = store.bcscSecure.deviceCode
      return
    }

    try {
      const deviceAuth = await authorization.authorizeDevice()

      const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)

      await updateUserInfo({
        email: deviceAuth.verified_email || BCSC_EMAIL_NOT_PROVIDED,
        isEmailVerified: !!deviceAuth.verified_email,
      })

      await updateDeviceCodes({
        deviceCode: deviceAuth.device_code,
        userCode: deviceAuth.user_code,
        deviceCodeExpiresAt: expiresAt,
      })

      deviceCodeRef.current = deviceAuth.device_code
    } catch (error) {
      if (isHandledAppError(error)) {
        return
      }

      logger.error('[useAccountTransferQRCodeStrategy]: Device registration failed', { error })
    }
  }, [store.bcscSecure.deviceCode, authorization, updateDeviceCodes, updateUserInfo, logger])

  const transferAccount = useCallback(
    async (value: string, transferToken: string) => {
      const account = await getAccount()
      if (!account) {
        throw new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAccountFound'))
      }

      // ias tokens expect times in seconds since epoch
      const timeInSeconds = Math.floor(Date.now() / 1000)

      const newDeviceJWT = await createDeviceSignedJWT({
        aud: account.issuer,
        iss: account.clientID,
        sub: account.clientID,
        iat: timeInSeconds,
        exp: timeInSeconds + 60, // give this token 1 minute to live
        jti: uuid.v4().toString(),
      })

      const deviceCode = deviceCodeRef.current
      if (!deviceCode) {
        throw new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoDeviceCodeFound'))
      }

      // Attest: verify the new device
      const response = await deviceAttestation.verifyAttestation({
        client_id: account.clientID,
        device_code: deviceCode,
        attestation: transferToken,
        client_assertion: newDeviceJWT,
      })

      if (!response) {
        throw new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAttestationResponse'))
      }

      // fetch tokens for the new device
      const deviceToken = await token.deviceToken({
        client_id: account.clientID,
        device_code: deviceCode,
        client_assertion: newDeviceJWT,
      })

      apiClient.tokens = deviceToken
      await updateTokens({ refreshToken: deviceToken.refresh_token, accessToken: deviceToken.access_token })
    },
    [t, deviceAttestation, token, apiClient, updateTokens]
  )

  const matches = useCallback((uri: string): boolean => {
    return extractTransferToken(uri) !== null
  }, [])

  const handle = useCallback(
    async (uri: string): Promise<void> => {
      const transferToken = extractTransferToken(uri)

      if (!transferToken) {
        logger.warn('[useAccountTransferQRCodeStrategy] matched but failed to extract transferToken')
        throw new QrCodeScanError(t('BCSC.Scan.UnrecognizedQR'))
      }

      await registerDevice()
      await transferAccount(uri, transferToken)

      onSuccess()
    },
    [logger, onSuccess, registerDevice, t, transferAccount]
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
