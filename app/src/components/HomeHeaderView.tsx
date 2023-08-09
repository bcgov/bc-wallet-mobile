import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import { CredentialState } from '@aries-framework/core'
import { useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/native'
import { Screens, Stacks, InfoBox, InfoBoxType, useStore } from 'aries-bifold'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet } from 'react-native'

import { showBCIDSelector } from '../helpers/BCIDHelper'
import { BCState, BCDispatchAction } from '../store'

interface HomeHeaderViewProps {
  children?: any
}

const HomeHeaderView: React.FC<HomeHeaderViewProps> = ({ children }) => {
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation()
  const { t } = useTranslation()
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]
  const credentialDefinitionIDs = credentials.map(
    (c) => c.metadata.data[AnonCredsCredentialMetadataKey].credentialDefinitionId as string
  )
  const style = StyleSheet.create({
    container: {
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
    },
  })

  const onCallToActionPressed = () => {
    navigation.getParent()?.navigate(Stacks.NotificationStack, {
      screen: Screens.CustomNotification,
    })
  }

  const onClosePressed = () => {
    dispatch({
      type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
      payload: [{ personCredentialOfferDismissed: true }],
    })
  }

  return (
    <>
      {!store.dismissPersonCredentialOffer && showBCIDSelector(credentialDefinitionIDs, true) && (
        <View style={style.container}>
          <InfoBox
            notificationType={InfoBoxType.Info}
            title={t('BCID.GetDigitalID')}
            description={t('PersonCredentialNotification.Description')}
            onCallToActionPressed={onCallToActionPressed}
            onCallToActionLabel="Start"
            onClosePressed={onClosePressed}
          />
          {children}
        </View>
      )}
    </>
  )
}

export default HomeHeaderView
