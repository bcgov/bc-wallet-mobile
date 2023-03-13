import { CredentialState } from '@aries-framework/core'
import { useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import { Screens, Stacks } from 'aries-bifold'
import React, { useEffect } from 'react'

interface CredentialOfferTriggerProps {
  workflowConnectionId?: string
}

const CredentialOfferTrigger: React.FC<CredentialOfferTriggerProps> = ({ workflowConnectionId }) => {
  const navigation = useNavigation()

  const offers = useCredentialByState(CredentialState.OfferReceived)

  const goToCredentialOffer = (credentialId?: string) => {
    navigation.getParent()?.navigate(Stacks.NotificationStack, {
      screen: Screens.CredentialOffer,
      params: { credentialId },
    })
  }

  useEffect(() => {
    for (const credential of offers) {
      if (credential.state == CredentialState.OfferReceived && credential.connectionId === workflowConnectionId) {
        goToCredentialOffer(credential.id)
      }
    }
  }, [offers, workflowConnectionId])

  return null
}

export default CredentialOfferTrigger
