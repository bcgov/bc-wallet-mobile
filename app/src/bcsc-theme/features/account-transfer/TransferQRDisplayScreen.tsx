import { Button, ButtonType, QRRenderer, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import { SafeAreaView } from 'react-native-safe-area-context'
import uuid from 'react-native-uuid'

const TransferQRDisplayScreen: React.FC = () => {
  const { t } = useTranslation()
  const { ColorPalette, themeName, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState('')
  // Ok what is going on here
  // I need to generate a JWT and create a URL based on the current environment
  // then turn that URL into a QR code

  // TODO: (Alfred) A timer would be cool idea to refresh the QR code automatically
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    },
    text: {
      fontSize: 18,
      color: '#333',
    },
  })

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

    setQRValue(jwt)
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}
      edges={['bottom', 'left', 'right']}
    >
      <View style={styles.container}>
        <Text style={styles.text}>Scan this QR code in the BC Services Card app on your other mobile device.</Text>
        <QRRenderer value={qrValue} />
        <Button buttonType={ButtonType.Primary} title="Refresh QR Code" onPress={createToken} />
      </View>
    </SafeAreaView>
  )
}

export default TransferQRDisplayScreen
