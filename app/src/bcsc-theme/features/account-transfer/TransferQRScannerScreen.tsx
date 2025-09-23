import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCState } from '@/store'
import { MaskType, ScanCamera, SVGOverlay, ThemedText, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { createDeviceSignedJWT, getAccount } from 'react-native-bcsc-core'
import uuid from 'react-native-uuid'

const TransferQRScannerScreen: React.FC = () => {
  const { deviceAttestation } = useApi()
  const [store] = useStore<BCState>()
  const { ColorPalette, Spacing } = useTheme()
  const handleScan = async (value: string) => {
    console.log('SCANNED A QR CODE!!!!')
    const token = value.split('?')[1]
    const epoch = Date.now()
    const account = await getAccount()
    if (!account) {
      // BIG ERROR, NO ACCOUNT ABORT
      return
    }
    console.log('GOT AN ACCOUNT')
    console.log('DO I HAVE A DEVICE CODE?', store.bcsc.deviceCode)

    console.log('GOT AN ACCESS TOKEN: ', store.bcsc.registrationAccessToken)

    // TODO: (Alfred) Investigate device signing. Android -> ios = not working. ios -> ios = QR code scans properly
    const jwt = await createDeviceSignedJWT({
      aud: 'https://idsit.gov.bc.ca/device/',
      iss: account.clientID,
      sub: account.clientID,
      iat: epoch,
      exp: epoch + 60, // give this token 1 minute to live
      jti: uuid.v4().toString(),
    })
    console.log('BUILT A JWT')
    const response = deviceAttestation.verifyAttestation({
      client_id: account.clientID,
      device_code: '',
      attestation: token,
      client_assertion: jwt,
    })

    console.log(response)
  }
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
  return (
    <View style={styles.container}>
      <View>
        <ThemedText variant="headerTitle" style={{ paddingBottom: Spacing.lg }}>
          A valid QR code will scan automatically
        </ThemedText>
      </View>
      <ScanCamera handleCodeScan={handleScan} />

      <SVGOverlay maskType={MaskType.QR_CODE} strokeColor={ColorPalette.grayscale.white} />
      {/* <ScanCamera handleCodeScan={handleScan} /> */}
    </View>
  )
}

export default TransferQRScannerScreen
