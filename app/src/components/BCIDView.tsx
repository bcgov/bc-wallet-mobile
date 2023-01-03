import { CredentialState, CredentialMetadataKeys } from '@aries-framework/core'
import { useAgent, useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import {
  Button,
  ButtonType,
  testIdWithKey,
  HomeContentView,
  Screens,
  useStore,
  useTheme
} from 'aries-bifold'
import React, { useEffect, useState, useRef, ReducerAction } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Animated } from 'react-native'

import { BCState } from '../store'
import Icon from 'react-native-vector-icons/MaterialIcons'

import CredentialIcon from '../assets/img/credentialIcon.svg'
import { showBCIDSelector, startFlow, WellKnownAgentDetails } from '../helpers/BCIDHelper'


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

  const rotationAnim = useRef(new Animated.Value(0)).current
  const timing: Animated.TimingAnimationConfig = {
    toValue: 1,
    duration: 2000,
    useNativeDriver: true,
  }
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })


  const onGetIdTouched = () => {
    setWorkflowInFlight(true)
    startFlow(agent, store, dispatch as React.Dispatch<ReducerAction<any>>, setWorkflowInFlight, t, setAgentDetails)
  }

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(rotationAnim, timing))
    animation.reset()
    if (workflowInFlight) {
      animation.start()
    } else {
      animation.stop()
    }
  }, [rotationAnim, workflowInFlight])

  return (
    <HomeContentView>
      {showGetFoundationCredential && (
        <View style={{ marginVertical: 40, marginHorizontal: 25 }}>
          <Button
            title={t('BCID.GetDigitalID')}
            accessibilityLabel={t('BCID.GetDigitalID')}
            testID={testIdWithKey('GetBCID')}
            onPress={onGetIdTouched}
            buttonType={!workflowInFlight ? ButtonType.Secondary : ButtonType.Primary}
            disabled={workflowInFlight}
          >
            {
              workflowInFlight ? (
                <Animated.View style={[{ transform: [{ rotate: rotation }] }]}>
                  <Icon style={{ color: ColorPallet.grayscale.white }} size={35} name="refresh" />
                </Animated.View>
              ) : <CredentialIcon style={{ marginRight: 10 }} />
            }
          </Button>
        </View>
      )}
    </HomeContentView>
  )
}

export default BCIDView
