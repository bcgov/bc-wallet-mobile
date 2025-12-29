import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import useRegistrationApi from '@/bcsc-theme/api/hooks/useRegistrationApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCOnboardingStackParams } from '@/bcsc-theme/types/navigators'
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
import { AccountSecurityMethod, getAccount } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useCameraPermission } from 'react-native-vision-camera'

// TODO (Al): Need to run a factoryReset if the QR code fails
const TransferQRScannerScreen: React.FC = () => {
  const { deviceAttestation, authorization, token } = useApi()
  const { client, isClientReady } = useBCSCApiClientState()
  const navigator = useNavigation<StackNavigationProp<BCSCOnboardingStackParams>>()
  const [store] = useStore<BCState>()
  const reset = useFactoryReset()

  const { register } = useRegistrationApi(client, isClientReady)
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

    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
    await updateUserInfo({
      email: deviceAuth.verified_email || BCSC_EMAIL_NOT_PROVIDED,
      isEmailVerified: true,
    })
    await updateDeviceCodes({
      deviceCode: deviceAuth.device_code,
      userCode: deviceAuth.user_code,
      deviceCodeExpiresAt: expiresAt,
    })
  }, [store.bcscSecure.deviceCode, authorization, updateDeviceCodes, updateUserInfo])

  useEffect(() => {
    registerDevice()
  }, [registerDevice])

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
    reset()
  }, [])

  const handleScan = useCallback(
    async (value: string) => {
      // exit early if processing a scan already or if there's an error showing
      if (isLoading || scanError != null) {
        return
      }

      setIsLoading(true)
      setScanError(null)

      /*
      - this needs to register the device
      - take the device code from that (save it) 
      - use the client ID from the decoded QR code?
      */

      // TODO: (Al) Is there a security method for self transfer?
      // TODO: (Al) This will need to clean up when this screen in loaded, remove anything and re-register
      const registrationResults = await register(AccountSecurityMethod.)
      let clientId = ''
      // What happens if go back to this screen afterwards? like register, get an account, then close the app?
      // do the registration results have what we need?
      console.log('Registration Results:', registrationResults?.client_id)
      const account = await getAccount()
      if (!account) {
        setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAccountFound')))
        return
      }
      clientId = account?.clientID

      console.log('_____ CLIENT ID: ')
      console.log(clientId)



      // console.log('Scanned QR Code:', account)
      // try {
      //   const qrToken = value.split('?')[1]
      //   // ias tokens expect times in seconds since epoch
      //   const timeInSeconds = Math.floor(Date.now() / 1000)
      //   console.log('QR Token:', qrToken)
      //   const decodedQR = jwtDecode(qrToken)

      //   const jwt = await createDeviceSignedJWT({
      //     aud: decodedQR.aud,
      //     iss: decodedQR.iss,
      //     sub: decodedQR.sub,
      //     iat: timeInSeconds,
      //     exp: timeInSeconds + 60, // give this token 1 minute to live
      //     jti: uuid.v4().toString(),
      //   })

      //   console.log('________')
      //   console.log(jwt)
      //   console.log(store.bcscSecure.deviceCode)
      //   if (store.bcscSecure.deviceCode) {
      //     const response = await deviceAttestation.verifyAttestation({
      //       client_id: decodedQR.iss,
      //       device_code: store.bcscSecure.deviceCode,
      //       attestation: qrToken,
      //       client_assertion: jwt,
      //     })

      //     if (!response) {
      //       setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAttestationResponse')))
      //       return
      //     }

      //     const deviceToken = await token.deviceToken({
      //       client_id: decodedQR.iss,
      //       device_code: store.bcscSecure.deviceCode,
      //       client_assertion: jwt,
      //     })
      //     console.log('______________')
      //     console.log('______________')
      //     console.log('______________')
      //     console.log(store.bcscSecure.deviceCode)
      //     console.log(deviceToken)
      //     // api client needs the new tokens from IAS
      //     if (client) {
      //       client.tokens = deviceToken
      //     }

      //     // TODO (bm): clean up old way below and implement nickname and app security selection
      //     // flow after successful transfer, followed by account creation and login

      //     // I wonder how this will change things...
      //   } else {
      //     setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoDeviceCodeFound')))
      //   }
      // } catch (error) {
      //   setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, (error as Error)?.message))
      // } finally {
      //   setIsLoading(false)
      // }
    },
    [store.bcscSecure.deviceCode, deviceAttestation, client, t, token, isLoading, scanError]
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
