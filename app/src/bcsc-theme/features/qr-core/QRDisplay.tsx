import { Agent, QRRenderer } from '@bifold/core'
import { createConnectionInvitation } from '@bifold/core/lib/typescript/src/utils/helpers'
import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import { useBCSCAgent } from '../agent'
import WalletNameDisplay from './WalletNameDisplay'

const QRDisplay: React.FC = () => {
  const { agent } = useBCSCAgent()
  const { width } = useWindowDimensions()
  const qrSize = width - 80
  const [invitation, setInvitation] = useState<string | undefined>(undefined)

  useEffect(() => {
    const fetchInvitation = async () => {
      const newInvitation = await createConnectionInvitation(agent as Agent)
      setInvitation(newInvitation.invitationUrl)
    }
    fetchInvitation()
  }, [agent])

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
