import { QRRenderer, ThemedText, useTheme } from '@bifold/core'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import { SafeAreaView } from 'react-native-safe-area-context'
import uuid from 'react-native-uuid'

const TransferQRDisplayScreen: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPalette, themeName, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState<string | null>(null)

  // TODO: (Alfred) A timer would be cool idea to refresh the QR code automatically
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
  }, [])

  const createToken = async () => {
    const epoch = Date.now()
    const client = await getAccount()
    if (!client) {
      // BIG ERROR, NO ACCOUNT ABORT
      return
    }
    const jwt = await createDeviceSignedJWT({
      aud: 'https://idsit.gov.bc.ca/device/',
      iss: client.clientID,
      sub: client.clientID,
      iat: epoch,
      exp: epoch + 60, // give this token 1 minute to live
      jti: uuid.v4().toString(),
    })

    const url = `https://idsit.gov.bc.ca/device/static/selfsetup.html?${jwt}`
    console.log(jwt)
    setQRValue('https://idsit.gov.bc.ca/device/static/selfsetup.html?assertion=' + 'butts')
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']}>
      <View style={styles.container}>
        <ThemedText variant="headerTitle">
          Scan this QR code in the BC Services Card app on your other mobile device.
        </ThemedText>
        <View style={{ flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          {qrValue && <QRRenderer value={qrValue} />}
        </View>
        {/* <Button buttonType={ButtonType.Primary} title="Refresh QR Code" onPress={createToken} /> */}
      </View>
    </SafeAreaView>
  )
}

export default TransferQRDisplayScreen
