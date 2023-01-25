import { CredentialState, CredentialMetadataKeys } from '@aries-framework/core'
import { useAgent, useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import { Button, ButtonType, testIdWithKey, HomeContentView, Screens, useStore, useTheme } from 'aries-bifold'
import React, { useEffect, useState, useRef, ReducerAction } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { BCState } from '../store'

import CredentialIcon from '../assets/img/credentialIcon.svg'
import { showBCIDSelector, startFlow, WellKnownAgentDetails } from '../helpers/BCIDHelper'
import LoadingIcon from './LoadingIcon'

const BCIDView: React.FC = () => {
  const { agent } = useAgent()
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [workflowInFlight, setWorkflowInFlight] = useState<boolean>(false)
  const [showGetFoundationCredential, setShowGetFoundationCredential] = useState<boolean>(false)
  const [agentDetails, setAgentDetails] = useState<WellKnownAgentDetails>({})
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]
  const navigation = useNavigation()
  const [canUseLSBCredential] = useState<boolean>(true)
  const { ColorPallet } = useTheme()

  useEffect(() => {
    for (const o of offers) {
      if (o.state == CredentialState.OfferReceived && o.connectionId === agentDetails?.connectionId) {
        navigation.getParent()?.navigate('Notifications Stack', {
          screen: Screens.CredentialOffer,
          params: { credentialId: o.id },
        })
      }
    }

    if (offers.length === 0 && workflowInFlight) {
      setWorkflowInFlight(false)
    }
  }, [offers])

  useEffect(() => {
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[CredentialMetadataKeys.IndyCredential].credentialDefinitionId as string
    )

    setShowGetFoundationCredential(showBCIDSelector(credentialDefinitionIDs, canUseLSBCredential))
  }, [credentials, canUseLSBCredential])

  const startGetBCIDCredentialWorkflow = () => {
    setWorkflowInFlight(true)
    startFlow(agent, store, dispatch as React.Dispatch<ReducerAction<any>>, setWorkflowInFlight, t, setAgentDetails)
  }

  return (
    <HomeContentView>
      {showGetFoundationCredential && (
        <View style={{ marginVertical: 40, marginHorizontal: 25 }}>
          <Button
            title={t('BCID.GetDigitalID')}
            accessibilityLabel={t('BCID.GetDigitalID')}
            testID={testIdWithKey('GetBCID')}
            onPress={startGetBCIDCredentialWorkflow}
            buttonType={!workflowInFlight ? ButtonType.Secondary : ButtonType.Primary}
            disabled={workflowInFlight}
          >
            {workflowInFlight ? (
              <LoadingIcon color={ColorPallet.grayscale.white} size={35} active={workflowInFlight} />
            ) : (
              <CredentialIcon style={{ marginRight: 10 }} />
            )}
          </Button>
        </View>
      )}
    </HomeContentView>
  )
}

export default BCIDView
