import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCSC_EMAIL_NOT_PROVIDED } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
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

const TransferQRScannerScreen: React.FC = () => {
  const { deviceAttestation, authorization, token } = useApi()
  const { client } = useBCSCApiClientState()
  const navigator = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()
  const [store, dispatch] = useStore<BCState>()
  const { ColorPalette, Spacing } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const { hasPermission, requestPermission } = useCameraPermission()
  const { t } = useTranslation()

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
    if (store.bcsc.deviceCode) {
      return
    }
    const deviceAuth = await authorization.authorizeDevice()
    // device already authorized
    if (deviceAuth === null) {
      return
    }

    const expiresAt = new Date(Date.now() + deviceAuth.expires_in * 1000)
    dispatch({
      type: BCDispatchAction.UPDATE_EMAIL,
      payload: [{ email: deviceAuth.verified_email || BCSC_EMAIL_NOT_PROVIDED, emailConfirmed: true }],
    })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
    dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
  }, [store.bcsc.deviceCode, authorization, dispatch])

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
        const qrToken = value.split('?')[1]
        // ias tokens expect times in seconds since epoch
        const timeInSeconds = Math.floor(Date.now() / 1000)

        const jwt = await createDeviceSignedJWT({
          aud: account.issuer,
          iss: account.clientID,
          sub: account.clientID,
          iat: timeInSeconds,
          exp: timeInSeconds + 60, // give this token 1 minute to live
          jti: uuid.v4().toString(),
        })

        if (store.bcsc.deviceCode) {
          const response = await deviceAttestation.verifyAttestation({
            client_id: account.clientID,
            device_code: store.bcsc.deviceCode,
            attestation: qrToken,
            client_assertion: jwt,
          })

          if (!response) {
            setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoAttestationResponse')))
            return
          }

          const deviceToken = await token.deviceToken({
            client_id: account.clientID,
            device_code: store.bcsc.deviceCode,
            client_assertion: jwt,
          })

          // api client needs the new tokens from IAS
          if (client) {
            client.tokens = deviceToken
          }

          dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [deviceToken.refresh_token] })

          navigator.navigate(BCSCScreens.VerificationSuccess)
        } else {
          setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, t('BCSC.Scan.NoDeviceCodeFound')))
        }
      } catch (error) {
        setScanError(new QrCodeScanError(t('BCSC.Scan.InvalidQrCode'), value, (error as Error)?.message))
      } finally {
        setIsLoading(false)
      }
    },
    [store.bcsc.deviceCode, deviceAttestation, client, dispatch, navigator, t, token, isLoading, scanError]
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
