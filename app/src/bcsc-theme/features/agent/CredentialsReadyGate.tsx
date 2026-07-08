import { useTheme } from '@bifold/core'
import { useCredentials } from '@bifold/react-hooks'
import React, { PropsWithChildren } from 'react'
import { ActivityIndicator, View } from 'react-native'

type Props = PropsWithChildren<{ testID?: string }>

/**
 * Holds children behind a spinner until Credo's DIDComm credential records
 * have finished their initial load. Prevents the Wallet tab from flashing the
 * empty state (EmptyWalletList) before an existing credential is available.
 * BCSC credentials are DIDComm AnonCreds, so useCredentials().loading is the
 * relevant signal; it always resolves to false (even with zero credentials),
 * so a genuinely empty wallet still renders the empty state after this brief
 * spinner rather than spinning forever.
 */
const CredentialsReadyGate: React.FC<Props> = ({ children, testID }) => {
  const { loading } = useCredentials()
  const { ColorPalette } = useTheme()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID={testID}>
        <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
      </View>
    )
  }

  return <>{children}</>
}

export default CredentialsReadyGate
