import { ButtonLocation, IconButton, QRRenderer, TOKENS, testIdWithKey, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
// import { useBCSCAgent } from '../agent'
import WalletNameDisplay from './WalletNameDisplay'

const QRDisplay: React.FC = () => {
  // const { agent } = useBCSCAgent()
  const navigation = useNavigation()
  const { width } = useWindowDimensions()
  const qrSize = width - 80
  const [invitation, setInvitation] = useState<string | undefined>(undefined)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          buttonLocation={ButtonLocation.Right}
          icon="share-variant"
          accessibilityLabel="Share"
          testID={testIdWithKey('Share')}
          onPress={() => {
            if (!invitation) { return }
            logger.info(`QR invitation: ${invitation}`)
          }}
        />
      ),
    })
  }, [navigation, invitation, logger])

  useEffect(() => {
    const fetchInvitation = async () => {
      // const newInvitation = await createConnectionInvitation(agent as Agent)
      // setInvitation(newInvitation.invitationUrl)
      setInvitation('https://example.com/invitation') // Placeholder for testing
    }
    fetchInvitation()
  }, [])

  const styles = StyleSheet.create({
    content: {
      alignItems: 'center',
      paddingTop: 20,
    },
  })

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <QRRenderer value={invitation || ''} size={qrSize} />
      <WalletNameDisplay />
    </ScrollView>
  )
}

export default QRDisplay
