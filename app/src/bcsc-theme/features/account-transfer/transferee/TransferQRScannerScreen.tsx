import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { BCState } from '@/store'
import {
  DismissiblePopupModal,
  MaskType,
  QrCodeScanError,
  ScanCamera,
  ScreenWrapper,
  SVGOverlay,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useCameraPermission } from 'react-native-vision-camera'

/**
 * The TransferQRScannerScreen component allows users to scan a QR code to transfer their account from an old verified device to a new, un verified one.
 * Successful scanning and verification will navigate the user to a success screen, then to the home screen of the app.
 *
 * This handles:
 *  - Camera permissions
 *  - QR code scanning
 *  - Device authorization (with IAS backend)
 *  - Device attestation and verification
 *  - Token retrieval and storage
 *
 * @returns {*} {JSX.Element} The rendered TransferQRScannerScreen component.
 */
const TransferQRScannerScreen: React.FC = () => {
  const { deviceAttestation, authorization, token } = useApi()
  const { updateTokens } = useSecureActions()
  const navigator = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const [store] = useStore<BCState>()
  const { ColorPalette, Spacing } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const { hasPermission, requestPermission } = useCameraPermission()
  const { t } = useTranslation()
  const { updateUserInfo, updateDeviceCodes } = useSecureActions()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      color: ColorPalette.grayscale.white,
      padding: Spacing.md,
    },
    messageContainer: {
      marginHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingTop: 30,
    },
  })

  const registerDevice = useCallback(async () => {
    // we already have a device code, no need to authorize again
    if (store.bcscSecure.deviceCode) {
      return
    }

    const deviceAuth = await authorization.authorizeDevice()
    // device already authorized
    if (deviceAuth === null) {
      return
    }

    // New device registered, store
    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)

    // Update user information
    await updateUserInfo({
      email: deviceAuth.verified_email || BCSC_EMAIL_NOT_PROVIDED,
      isEmailVerified: !!deviceAuth.verified_email,
    })

    // Update secure store with device codes
    await updateDeviceCodes({
      deviceCode: deviceAuth.device_code,
      userCode: deviceAuth.user_code,
      deviceCodeExpiresAt: expiresAt,
    })
  }, [store.bcscSecure.deviceCode, authorization, updateDeviceCodes, updateUserInfo])

  useEffect(() => {
    const checkPermissions = async () => {
      if (!hasPermission) {
        const permission = await requestPermission()
        if (!permission) {
          Alert.alert(
            t('BCSC.CameraDisclosure.CameraPermissionRequired'),
            t('BCSC.CameraDisclosure.CameraPermissionRequiredMessage2'),
            [{ text: t('BCSC.CameraDisclosure.OK'), onPress: () => navigator.goBack() }]
          )
          return
        }
      }
      setIsLoading(false)
    }

    checkPermissions()
  }, [hasPermission, requestPermission, navigator, t])

  useEffect(() => {
    registerDevice()
  }, [registerDevice])

  const handleScan = useCallback(
    async (value: string) => {
      // exit early if processing a scan already or if there's an error showing
      if (isLoading || scanError != null) {
        return
      }

      setIsLoading(true)
      setScanError(null)

      const account = await getAccount()
      if (!account) {
        setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAccountFound')))
        return
      }

      try {
        // ias tokens expect times in seconds since epoch
        const timeInSeconds = Math.floor(Date.now() / 1000)
        const qrParts = value.split('?')
        const oldDeviceQRToken = qrParts.length > 1 ? qrParts[1] : undefined
        if (!oldDeviceQRToken) {
          throw new Error(t('BCSC.Scan.InvalidQrCode'))
        }

        const newDeviceJWT = await createDeviceSignedJWT({
          aud: account.issuer,
          iss: account.clientID,
          sub: account.clientID,
          iat: timeInSeconds,
          exp: timeInSeconds + 60, // give this token 1 minute to live
          jti: uuid.v4().toString(),
        })

        if (store.bcscSecure.deviceCode) {
          // Attest: verify the new device
          const response = await deviceAttestation.verifyAttestation({
            client_id: account.clientID,
            device_code: store.bcscSecure.deviceCode,
            attestation: oldDeviceQRToken,
            client_assertion: newDeviceJWT,
          })

          if (!response) {
            throw t('BCSC.Scan.NoAttestationResponse')
          }

          // fetch tokens for the new device
          const deviceToken = await token.deviceToken({
            client_id: account.clientID,
            device_code: store.bcscSecure.deviceCode,
            client_assertion: newDeviceJWT,
          })

          await updateTokens({ refreshToken: deviceToken.refresh_token, accessToken: deviceToken.access_token })

          navigator.navigate(BCSCScreens.VerificationSuccess)
        } else {
          throw t('BCSC.Scan.NoDeviceCodeFound')
        }
      } catch (error) {
        setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, (error as Error)?.message))
      } finally {
        setIsLoading(false)
      }
    },
    [store, deviceAttestation, t, token, isLoading, scanError, navigator, updateTokens]
  )

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  if (!hasPermission) {
    return (
      <ScreenWrapper padded={false} scrollable={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText style={{ color: 'white' }}>{t('BCSC.CameraDisclosure.CameraPermissionRequired')}</ThemedText>
        </View>
      </ScreenWrapper>
    )
  }
  return (
    <View style={styles.container}>
      <ScanCamera handleCodeScan={handleScan} enableCameraOnError={true} error={scanError} />
      <View pointerEvents="none">
        <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      </View>
      <View style={styles.messageContainer}>
        <Icon name="qrcode-scan" size={40} style={styles.icon} />
        <ThemedText variant="title">{t('BCSC.Scan.WillScanAutomatically')}</ThemedText>
      </View>
      {scanError && (
        <DismissiblePopupModal
          title={t('BCSC.Scan.ErrorDetails')}
          description={scanError.message}
          onCallToActionLabel={t('BCSC.Scan.Dismiss')}
          onCallToActionPressed={() => setScanError(null)}
          onDismissPressed={() => setScanError(null)}
        />
      )}
    </View>
  )
}

export default TransferQRScannerScreen
