import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClient } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { isHandledAppError } from '@/errors/appError'
import { useAutoRequestPermission } from '@/hooks/useAutoRequestPermission'
import { BCState } from '@/store'
import { QrCodeScanError, TOKENS, useServices, useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import { useCameraPermission } from 'react-native-vision-camera'

const useTransferQRScannerViewModel = (navigation: StackNavigationProp<BCSCVerifyStackParams>) => {
  const { deviceAttestation, authorization, token } = useApi()
  const apiClient = useBCSCApiClient()
  const { updateTokens, updateUserInfo, updateDeviceCodes } = useSecureActions()
  const [store] = useStore<BCState>()
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { hasPermission, requestPermission } = useCameraPermission()
  const { t } = useTranslation()
  const deviceCodeRef = useRef<string | undefined>(store.bcscSecure.deviceCode)
  const registrationPromiseRef = useRef<Promise<void>>(Promise.resolve())
  const isProcessingRef = useRef(false)

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

      logger.error('[TransferQRScannerScreen]: Device registration failed', { error })
    }
  }, [store.bcscSecure.deviceCode, authorization, updateDeviceCodes, updateUserInfo, logger])

  const { isLoading: isPermissionLoading } = useAutoRequestPermission(hasPermission, requestPermission)

  useEffect(() => {
    registrationPromiseRef.current = registerDevice()
  }, [registerDevice])

  const handleScan = useCallback(
    async (value: string) => {
      // exit early if processing a scan already or if there's an error showing
      if (isProcessingRef.current || scanError != null) {
        return
      }

      isProcessingRef.current = true
      setIsLoading(true)
      setScanError(null)

      try {
        // wait for device registration to complete before proceeding
        await registrationPromiseRef.current

        const account = await getAccount()
        if (!account) {
          throw new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAccountFound'))
        }

        // ias tokens expect times in seconds since epoch
        const timeInSeconds = Math.floor(Date.now() / 1000)
        const qrParts = value.split('?')
        const oldDeviceQRToken = qrParts.length > 1 ? qrParts[1] : undefined
        if (!oldDeviceQRToken) {
          throw new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.InvalidQrCode'))
        }

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
          attestation: oldDeviceQRToken,
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

        navigation.navigate(BCSCScreens.VerificationSuccess)
      } catch (error) {
        if (error instanceof QrCodeScanError) {
          setScanError(error)
        } else {
          const message = error instanceof Error ? error.message : String(error)
          setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, message))
        }
      } finally {
        isProcessingRef.current = false
        setIsLoading(false)
      }
    },
    [deviceAttestation, t, token, scanError, navigation, updateTokens, apiClient]
  )

  const dismissError = useCallback(() => setScanError(null), [])

  return {
    isLoading,
    isPermissionLoading,
    hasPermission,
    scanError,
    handleScan,
    dismissError,
  }
}

export default useTransferQRScannerViewModel
