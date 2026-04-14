import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import {
  Button,
  ButtonType,
  QRRenderer,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { jwtDecode } from 'jwt-decode'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'

const qrCodeRefreshInterval = 50000 // 50 seconds
const jwtTimeToLive = 60 // 60 seconds
const attestationPollInterval = 3000 // 3 seconds

const TransferQRDisplayScreen: React.FC = () => {
  const jtiRef = useRef(uuid.v4().toString())
  const { deviceAttestation } = useApi()
  const { ColorPalette, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState<string | null>(null)
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { accountNotFoundAlert } = useAlerts(navigation)

  const styles = StyleSheet.create({
    qrCodeContainer: {
      backgroundColor: ColorPalette.grayscale.white,
      flexShrink: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.sm,
      borderRadius: Spacing.sm,
    },
  })

  const createToken = useCallback(async (): Promise<boolean> => {
    const timeInSeconds = Math.floor(Date.now() / 1000)
    const account = await getAccount()
    if (!account) {
      logger.error('[TransferQRDisplayScreen] Account not found in native storage')
      accountNotFoundAlert()
      setIsLoading(false)
      return false
    }

    const newJti = uuid.v4().toString()

    const jwt = await createDeviceSignedJWT({
      aud: account.issuer,
      iss: account.clientID,
      sub: account.clientID,
      iat: timeInSeconds,
      exp: timeInSeconds + jwtTimeToLive,
      jti: newJti,
    })

    // Ensure we are using the correct JTI incase the createDeviceSignedJWT method
    // uses a fallback JTI instead of our provided one or mutates it in-place
    const decoded = jwtDecode<{ jti?: string }>(jwt)
    jtiRef.current = decoded.jti ?? newJti
    const url = `${store.developer.environment.iasApiBaseUrl}/static/selfsetup.html?${jwt}`
    setQRValue(url)
    setIsLoading(false)
    return true
  }, [store.developer.environment.iasApiBaseUrl, logger, accountNotFoundAlert])

  const checkAttestation = useCallback(
    async (id: string) => {
      try {
        const response = await deviceAttestation.checkAttestationStatus(id)
        if (response) {
          navigation.navigate(BCSCScreens.TransferAccountSuccess)
        }
      } catch (error) {
        // Do nothing, a fail state from this endpoint just means the attestation hasn't been consumed yet
      }
    },
    [deviceAttestation, navigation]
  )
  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      createToken()
    }, qrCodeRefreshInterval)
  }, [createToken])

  const refreshToken = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const success = await createToken()
    if (success) {
      startInterval()
    }
  }, [createToken, startInterval])

  useEffect(() => {
    refreshToken()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refreshToken, startInterval])

  useEffect(() => {
    if (!qrValue) {
      return
    }
    // Snapshot the JTI at the time this effect runs. Reading jtiRef.current live inside the
    // setInterval closure would mean a QR rotation (createToken mutating jtiRef.current) silently
    // switches all in-flight polls to the new JTI, abandoning the consumed one before the 200 is seen.
    const jtiSnapshot = jtiRef.current
    checkAttestation(jtiSnapshot)
    const interval = setInterval(() => {
      checkAttestation(jtiSnapshot)
    }, attestationPollInterval)
    return () => clearInterval(interval)
  }, [checkAttestation, qrValue])

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  const controls = (
    <Button
      buttonType={ButtonType.Secondary}
      accessibilityLabel={t('BCSC.TransferQRDisplay.GetNewQRCode')}
      title={t('BCSC.TransferQRDisplay.GetNewQRCode')}
      testID={testIdWithKey('GetNewQRCode')}
      onPress={refreshToken}
    />
  )

  return (
    <ScreenWrapper controls={controls}>
      <ThemedText style={{ marginBottom: Spacing.xxl }} variant={'headingThree'}>
        {t('BCSC.TransferQRDisplay.Instructions')}
      </ThemedText>
      {qrValue && (
        <View style={styles.qrCodeContainer}>
          <QRRenderer value={qrValue} />
        </View>
      )}
    </ScreenWrapper>
  )
}

export default TransferQRDisplayScreen
