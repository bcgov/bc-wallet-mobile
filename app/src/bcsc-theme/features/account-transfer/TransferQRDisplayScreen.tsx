import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { QRRenderer, ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'

const TransferQRDisplayScreen: React.FC = () => {
  const jti = uuid.v4().toString()
  const { deviceAttestation } = useApi()
  const { ColorPalette, themeName, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState<string | null>(null)
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation<StackNavigationProp<BCSCVerifyIdentityStackParams>>()

  // TODO: (Alfred) Add a timer to automatically refresh the QR code every 30 seconds
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  })

  useEffect(() => {
    createToken()
    const interval = setInterval(() => {
      createToken()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    checkAttestation(jti)
    const interval = setInterval(() => {
      checkAttestation(jti)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const createToken = async () => {
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
      jti: jti,
    })
    const url = `${store.developer.environment.iasApiBaseUrl}/device/static/selfsetup.html?${jwt}`
    setQRValue(url)
  }

  const checkAttestation = async (id: string) => {
    const response = await deviceAttestation.checkAttestationStatus(id)
    if (response) {
      navigation.navigate(BCSCScreens.TransferAccountSuccess)
    }
  }

  return (
    <ScrollView>
      <View
        style={{
          flex: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: Spacing.xl,
        }}
      >
        <ThemedText variant="headerTitle" style={{ textAlign: 'center', paddingBottom: Spacing.md }}>
          Scan this QR code in the BC Services Card app on your other mobile device.
        </ThemedText>

        {qrValue && (
          <View
            style={{
              backgroundColor: ColorPalette.grayscale.white,
              flex: 1,
              padding: Spacing.sm,
              borderRadius: Spacing.sm,
              overflow: 'hidden',
            }}
          >
            <QRRenderer value={qrValue} />
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default TransferQRDisplayScreen
