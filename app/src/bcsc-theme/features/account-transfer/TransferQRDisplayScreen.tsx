import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { QRRenderer, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'

const TransferQRDisplayScreen: React.FC = () => {
  const jti = useMemo(() => uuid.v4().toString(), [])
  const { deviceAttestation } = useApi()
  const { ColorPalette, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState<string | null>(null)
  const [store] = useStore<BCState>()
  const { t } = useTranslation()
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
  })

  const createToken = useCallback(async () => {
    const timeInSeconds = Math.floor(Date.now() / 1000)
    const account = await getAccount()
    if (!account) {
      // TODO: (Alfred) What needs to happen here? The account should be created when they download the app
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

  useEffect(() => {
    createToken()
    const interval = setInterval(() => {
      createToken()
    }, 30000)
    return () => clearInterval(interval)
  }, [createToken])

  useEffect(() => {
    checkAttestation(jti)
    const interval = setInterval(() => {
      checkAttestation(jti)
    }, 3000)
    return () => clearInterval(interval)
  }, [checkAttestation, jti])

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
      </View>
    </ScrollView>
  )
}

export default TransferQRDisplayScreen
