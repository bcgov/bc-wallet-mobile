import { CredentialState, ProofState } from '@credo-ts/core'
import { useAgent, useCredentialByState, useProofByState } from '@credo-ts/react-hooks'
import {
  Button,
  ButtonType,
  Screens,
  NotificationStackParams,
  TOKENS,
  testIdWithKey,
  useStore,
  useTheme,
  EventTypes as BifoldEventTypes,
  BifoldError,
  AttestationEventTypes,
  useServices,
} from '@hyperledger/aries-bifold-core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DeviceEventEmitter,
  EmitterSubscription,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import PersonCredentialSpinner from '../components/PersonCredentialSpinner'
import { connectToIASAgent, authenticateWithServiceCard, WellKnownAgentDetails } from '../helpers/BCIDHelper'
import { BCState } from '../store'
type PersonProps = StackScreenProps<NotificationStackParams, Screens.CustomNotification>

const PersonCredentialLoading: React.FC<PersonProps> = ({ navigation }) => {
  const { ColorPallet, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const [remoteAgentDetails, setRemoteAgentDetails] = useState<WellKnownAgentDetails | undefined>()
  const receivedProofRequests = useProofByState(ProofState.RequestReceived)
  const timer = useRef<NodeJS.Timeout>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const receivedCredentialOffers = useCredentialByState(CredentialState.OfferReceived)
  const { agent } = useAgent()
  if (!agent) {
    throw new Error('Unable to fetch agent from Credo')
  }
  const { t } = useTranslation()
  const [didCompleteAttestationProofRequest, setDidCompleteAttestationProofRequest] = useState<boolean>(false)

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      backgroundColor: ColorPallet.brand.modalPrimaryBackground,
      padding: 20,
    },
    image: {
      marginTop: 80,
    },
    messageContainer: {
      alignItems: 'center',
      marginTop: 40,
    },
    messageText: {
      fontWeight: TextTheme.normal.fontWeight,
      textAlign: 'center',
      marginTop: 30,
    },
    controlsContainer: {
      marginTop: 'auto',
      margin: 20,
    },
    delayMessageText: {
      textAlign: 'center',
      marginTop: 20,
    },
  })

  const connect = async () => {
    try {
      const remoteAgentDetails = await connectToIASAgent(agent, store, t)
      setRemoteAgentDetails(remoteAgentDetails)
      logger.error(`Connected to IAS agent, connectionId: ${remoteAgentDetails.connectionId}`)
    } catch (err) {
      logger.error(`Failed to connect to IAS agent, error: ${(err as BifoldError).message}`)
    }
  }

  useEffect(() => {
    connect()
  }, [])

  // when a person credential offer is received, show the
  // offer screen to the user.
  const goToCredentialOffer = (credentialId: string) => {
    navigation.replace(Screens.CredentialOffer, { credentialId })
  }

  useEffect(() => {
    const handleFailedAttestation = (error: BifoldError) => {
      navigation.goBack()
      DeviceEventEmitter.emit(BifoldEventTypes.ERROR_ADDED, error)
    }

    const handleStartedAttestation = () => {
      logger.info('Attestation proof request started')
    }

    const handleStartedCompleted = () => {
      logger.info('Attestation proof request completed')

      timer.current && clearTimeout(timer.current)
      setDidCompleteAttestationProofRequest(true)
    }

    const subscriptions = Array<EmitterSubscription>()
    subscriptions.push(DeviceEventEmitter.addListener(AttestationEventTypes.Started, handleStartedAttestation))
    subscriptions.push(DeviceEventEmitter.addListener(AttestationEventTypes.Completed, handleStartedCompleted))
    subscriptions.push(DeviceEventEmitter.addListener(AttestationEventTypes.FailedHandleProof, handleFailedAttestation))
    subscriptions.push(DeviceEventEmitter.addListener(AttestationEventTypes.FailedHandleOffer, handleFailedAttestation))
    subscriptions.push(
      DeviceEventEmitter.addListener(AttestationEventTypes.FailedRequestCredential, handleFailedAttestation)
    )

    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
    }
  }, [])

  useEffect(() => {
    if (!remoteAgentDetails || !remoteAgentDetails.legacyConnectionDid || !didCompleteAttestationProofRequest) {
      return
    }

    const cb = (status: boolean) => {
      logger.info(`Service card authentication reported ${status}`)
      // TODO(jl): Handle the case where the service card authentication fails for
      // user reasons or otherwise.
      if (!status) {
        setDidCompleteAttestationProofRequest(false)
        navigation.goBack()
      }
    }

    const { iasPortalUrl } = store.developer.environment
    const { legacyConnectionDid } = remoteAgentDetails

    authenticateWithServiceCard(legacyConnectionDid, iasPortalUrl, cb)
      .then(() => {
        logger.error('Completed service card authentication successfully')
      })
      .catch((error) => {
        logger.error('Completed service card authentication with error, error: ', error.message)
      })
  }, [remoteAgentDetails, didCompleteAttestationProofRequest, store.developer.environment.iasPortalUrl])

  useEffect(() => {
    for (const credential of receivedCredentialOffers) {
      if (
        credential.state == CredentialState.OfferReceived &&
        credential.connectionId === remoteAgentDetails?.connectionId
      ) {
        goToCredentialOffer(credential.id)
      }
    }
  }, [receivedCredentialOffers, remoteAgentDetails])

  const onDismissModalTouched = () => {
    navigation.goBack()
  }

  return (
    <Modal transparent animationType={'slide'}>
      <SafeAreaView style={{ backgroundColor: ColorPallet.brand.modalPrimaryBackground }}>
        <ScrollView style={styles.container}>
          <View style={styles.messageContainer}>
            <Text style={[TextTheme.modalHeadingThree, styles.messageText]} testID={testIdWithKey('RequestProcessing')}>
              {t('ProofRequest.RequestProcessing')}
            </Text>
          </View>

          <View style={styles.image}>
            <PersonCredentialSpinner />
          </View>
          <Text style={[TextTheme.normal, styles.messageText]}>This can take a few seconds</Text>
        </ScrollView>
        <View style={styles.controlsContainer}>
          <Button
            title={t('Global.GoBack')}
            accessibilityLabel={t('Global.GoBack')}
            testID={testIdWithKey('BackToPersonScreen')}
            onPress={onDismissModalTouched}
            buttonType={ButtonType.ModalSecondary}
          />
        </View>
      </SafeAreaView>
    </Modal>
  )
}

export default PersonCredentialLoading
