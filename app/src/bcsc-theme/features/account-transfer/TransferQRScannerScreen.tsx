import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, BCState } from '@/store'
import { DismissiblePopupModal, MaskType, ScanCamera, SVGOverlay, ThemedText, useStore, useTheme } from '@bifold/core'
import { QrCodeScanError } from '@bifold/core/lib/typescript/src/types/error'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const TransferQRScannerScreen: React.FC = () => {
  const { deviceAttestation, authorization, token } = useApi()
  const { client } = useBCSCApiClientState()
  const navigator = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()
  const [store, dispatch] = useStore<BCState>()
  const { ColorPalette } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [scanError, setScanError] = useState<QrCodeScanError | null>(null)
  const { t } = useTranslation()

  const registerDevice = async () => {
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
      payload: [{ email: deviceAuth.verified_email, emailConfirmed: !!deviceAuth.verified_email }],
    })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE, payload: [deviceAuth.device_code] })
    dispatch({ type: BCDispatchAction.UPDATE_USER_CODE, payload: [deviceAuth.user_code] })
    dispatch({ type: BCDispatchAction.UPDATE_DEVICE_CODE_EXPIRES_AT, payload: [expiresAt] })
  }

  useEffect(() => {
    registerDevice()
  }, [])

  const handleScan = React.useCallback(
    async (value: string) => {
      setIsLoading(true)
      setScanError(null)
      try {
        const qrToken = value.split('?')[1]
        // ias tokens expect times in seconds since epoch
        const timeInSeconds = Math.floor(Date.now() / 1000)
        const account = await getAccount()
        if (!account) {
          // BIG ERROR, NO ACCOUNT ABORT
          return
        }

        // TODO: (Alfred) Investigate device signing. Android -> ios = not working. ios -> ios = QR code scans properly
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
            console.log('NO RESPONSE FROM VERIFY ATTESTATION Display an error pop up')
          }

          const deviceToken = await token.deviceToken({
            client_id: account.clientID,
            device_code: store.bcsc.deviceCode,
            attestation: qrToken,
            client_assertion: jwt,
          })

          // api client needs the new tokens from IAS
          if (client) {
            client.tokens = deviceToken
          }

          dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [deviceToken.refresh_token] })
          dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })

          setIsLoading(false)
        }
      } catch (error) {
        setScanError(new QrCodeScanError(t('Scan.InvalidQrCode'), value, (error as Error)?.message))
      } finally {
        setIsLoading(false)
      }
    },
    [store.bcsc.deviceCode, deviceAttestation, getAccount]
  )
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    icon: {
      color: ColorPalette.grayscale.white,
      padding: 4,
    },
    messageContainer: {
      marginHorizontal: 40,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      paddingTop: 30,
    },
  })

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <View style={styles.container}>
      <ScanCamera handleCodeScan={handleScan} enableCameraOnError={false} />
      <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      <View style={styles.messageContainer}>
        <>
          <Icon name="qrcode-scan" size={40} style={styles.icon} />
          <ThemedText variant="title">{t('Scan.WillScanAutomatically')}</ThemedText>
        </>
      </View>
      {scanError && (
        <DismissiblePopupModal
          title={t('Scan.ErrorDetails')}
          description={scanError.message}
          onCallToActionLabel={t('Global.Dismiss')}
          onCallToActionPressed={() => setScanError(null)}
          onDismissPressed={() => setScanError(null)}
        />
      )}
    </View>
  )
}

export default TransferQRScannerScreen
