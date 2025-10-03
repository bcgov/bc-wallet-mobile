import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { Button, ButtonType, QRRenderer, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'

const TransferQRDisplayScreen: React.FC = () => {
  const jti = useMemo(() => uuid.v4().toString(), [])
  const { deviceAttestation } = useApi()
  const { ColorPalette, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState<string | null>(null)
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    qrCodeContainer: {
      backgroundColor: ColorPalette.grayscale.white,
      flex: 1,
      padding: Spacing.sm,
      borderRadius: Spacing.sm,
      overflow: 'hidden',
    },
    refreshButton: {
      padding: Spacing.lg,
      width: '100%',
    },
  })

  const createToken = useCallback(async () => {
    const timeInSeconds = Math.floor(Date.now() / 1000)
    const account = await getAccount()
    if (!account) {
      // TODO: (Alfred) What needs to happen here? The account should be created when they download the app, do they need to reinstall?
      return
    }

    const jwt = await createDeviceSignedJWT({
      aud: account.issuer,
      iss: account.clientID,
      sub: account.clientID,
      iat: timeInSeconds,
      exp: timeInSeconds + 60, // give this token 1 minute to live
      jti: jti,
    })
    // TODO: can this be added to the well known endpoints?
    const url = `${store.developer.environment.iasApiBaseUrl}/device/static/selfsetup.html?${jwt}`
    setQRValue(url)
    setIsLoading(false)
  }, [store.developer.environment.iasApiBaseUrl, jti])

  const checkAttestation = useCallback(
    async (id: string) => {
      try {
        const response = await deviceAttestation.checkAttestationStatus(id)
        if (response) {
          navigation.navigate(BCSCScreens.TransferAccountSuccess)
        }
      } catch (error) {
        // TODO: (Alfred) Not sure we need to handle this, it pings until the request is 'satisfied' so failure is an ok state to be in
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
    }, 30000) // 30 seconds
  }, [createToken])

  const refreshToken = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    createToken()
    startInterval()
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
    checkAttestation(jti)
    const interval = setInterval(() => {
      checkAttestation(jti)
    }, 3000)
    return () => clearInterval(interval)
  }, [checkAttestation, jti])

  if (isLoading) {
    return <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        <ThemedText variant="headerTitle" style={{ textAlign: 'center', paddingBottom: Spacing.md }}>
          {t('Unified.TransferQRDisplay.Instructions')}
        </ThemedText>

        {qrValue && (
          <View style={styles.qrCodeContainer}>
            <QRRenderer value={qrValue} />
          </View>
        )}
        <View style={styles.refreshButton}>
          <Button buttonType={ButtonType.Primary} title="Refresh QR Code" onPress={refreshToken} />
        </View>
      </View>
    </ScrollView>
  )
}

export default TransferQRDisplayScreen
