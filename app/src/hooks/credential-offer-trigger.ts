import { CredentialState } from '@aries-framework/core'
import { useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/native'
import { Screens, Stacks } from 'aries-bifold'
import { useEffect } from 'react'

export const useCredentialOfferTrigger = (workflowConnectionId?: string): void => {
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
}
