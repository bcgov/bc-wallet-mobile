import useApi from '@/bcsc-theme/api/hooks/useApi'
import { QRRenderer, ThemedText, useTheme } from '@bifold/core'

import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'

const TransferQRDisplayScreen: React.FC = () => {
  const jti = uuid.v4().toString()
  const { deviceAttestation } = useApi()
  const { ColorPalette, themeName, Spacing } = useTheme()
  const [qrValue, setQRValue] = useState<string | null>(null)

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
    const interval = setInterval(() => {
      checkAttestation(jti)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const createToken = async () => {
    const epoch = Date.now()
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
      iat: epoch,
      exp: epoch + 60, // give this token 1 minute to live
      jti: jti,
    })

    const url = `https://idsit.gov.bc.ca/device/static/selfsetup.html?${jwt}`
    setQRValue(url)
  }

  const checkAttestation = async (id: string) => {
    const response = await deviceAttestation.checkAttestationStatus(id)
    console.log('CHECK ATTESTATION RESPONSE: ', response)
    if (response) {
      // clean up and navigate to the success screen
      // TODO: (Alfred) Create a timer, generisize the success screen for any text?
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText variant="headerTitle">
        Scan this QR code in the BC Services Card app on your other mobile device.
      </ThemedText>
      {qrValue && <QRRenderer value={qrValue} />}
      {/* <Button buttonType={ButtonType.Primary} title="Refresh QR Code" onPress={createToken} /> */}
    </View>
  )
}

export default TransferQRDisplayScreen
