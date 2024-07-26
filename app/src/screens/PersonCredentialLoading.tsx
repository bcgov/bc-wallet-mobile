import { CredentialState, ProofExchangeRecord, ProofState } from '@credo-ts/core'
import { useAgent, useCredentialByState, useProofByState } from '@credo-ts/react-hooks'
import {
  BifoldAgent,
  Button,
  ButtonType,
  Screens,
  Stacks,
  TOKENS,
  testIdWithKey,
  useContainer,
  useStore,
  useTheme,
  EventTypes as BifoldEventTypes,
  BifoldError,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
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
import { useAttestation } from '../hooks/useAttestation'
import { AttestationEventTypes } from '../services/attestation'
import { BCState } from '../store'

export default function PersonCredentialLoading() {
  const { ColorPallet, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const [remoteAgentDetails, setRemoteAgentDetails] = useState<WellKnownAgentDetails | undefined>()
  const receivedProofRequests = useProofByState(ProofState.RequestReceived)
  const timer = useRef<NodeJS.Timeout>()
  const logger = useContainer().resolve(TOKENS.UTIL_LOGGER)
  const receivedCredentialOffers = useCredentialByState(CredentialState.OfferReceived)
  const { loading: attestationLoading } = useAttestation ? useAttestation() : { loading: false }
  const { agent } = useAgent()
  if (!agent) {
    throw new Error('Unable to fetch agent from Credo')
  }
  const navigation = useNavigation()
  const { t } = useTranslation()
  const attestationProofRequestWaitTimeout = 10000
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

  useEffect(() => {
    connectToIASAgent(agent, store, t)
      .then((remoteAgentDetails: WellKnownAgentDetails) => {
        setRemoteAgentDetails(remoteAgentDetails)

        timer.current = setTimeout(() => {
          if (!remoteAgentDetails || !remoteAgentDetails.connectionId) {
            return
          }

          const proofRequest = receivedProofRequests.find(
            (proof) => proof.connectionId === remoteAgentDetails.connectionId
          )

          if (!proofRequest) {
            // No proof from our IAS Agent to respond to, do nothing.
            logger.info(
              `Waited ${attestationProofRequestWaitTimeout / 1000}sec on attestation proof request, continuing`
            )

            setDidCompleteAttestationProofRequest(true)
          }
        }, attestationProofRequestWaitTimeout)

        logger.error(`Connected to IAS agent, connectionId: ${remoteAgentDetails?.connectionId}`)
      })
      .catch((error) => {
        logger.error(`Failed to connect to IAS agent, error: ${error.message}`)
      })
  }, [])

  // Use this function to accept the attestation proof request.
  const acceptAttestationProofRequest = async (agent: BifoldAgent, proofRequest: ProofExchangeRecord) => {
    logger.info('Attestation: selecting credentials for attestation proof request')
    // This will throw if we don't have the necessary credentials
    const credentials = await agent.proofs.selectCredentialsForRequest({
      proofRecordId: proofRequest.id,
    })

    logger.info('Attestation: accepting attestation proof request')
    await agent.proofs.acceptRequest({
      proofRecordId: proofRequest.id,
      proofFormats: credentials.proofFormats,
    })

    return true
  }

  // when a person credential offer is received, show the
  // offer screen to the user.
  const goToCredentialOffer = (credentialId?: string) => {
    navigation.getParent()?.navigate(Stacks.NotificationStack, {
      screen: Screens.CredentialOffer,
      params: { credentialId },
    })
  }

  useEffect(() => {
    const handleFailedAttestation = (error: BifoldError) => {
      navigation.goBack()
      DeviceEventEmitter.emit(BifoldEventTypes.ERROR_ADDED, error)
    }

    const subscriptions = Array<EmitterSubscription>()
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
    // If we are fetching an attestation credential, do no yet have
    // a remote connection ID to the IAS agent, or the agent is not
    // initialized, do nothing.
    if (attestationLoading || !remoteAgentDetails || !agent) {
      return
    }

    // We have an attestation credential and can respond to an
    // attestation proof request.
    const proofRequest = receivedProofRequests.find((proof) => proof.connectionId === remoteAgentDetails.connectionId)
    if (!proofRequest) {
      // No proof from our IAS Agent to respond to, do nothing.
      return
    }

    timer.current && clearTimeout(timer.current)

    if (!didCompleteAttestationProofRequest) {
      acceptAttestationProofRequest(agent, proofRequest)
        .then((status: boolean) => {
          // We can unblock the workflow and proceed with
          // authentication.
          setDidCompleteAttestationProofRequest(status)
          logger.info(`Accepted IAS attestation proof request with status: ${status}`)
        })
        .catch((error) => {
          setDidCompleteAttestationProofRequest(false)
          logger.error(`Unable to accept IAS attestation proof request, error: ${error.message}`)
        })
    }
  }, [attestationLoading, receivedProofRequests, remoteAgentDetails, agent])

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
  }, [remoteAgentDetails, didCompleteAttestationProofRequest])

  useEffect(() => {
    if (!remoteAgentDetails || !remoteAgentDetails.connectionId) {
      return
    }

    for (const credential of receivedCredentialOffers) {
      if (
        credential.state == CredentialState.OfferReceived &&
        credential.connectionId === remoteAgentDetails.connectionId
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
        <ScrollView style={[styles.container]}>
          <View style={[styles.messageContainer]}>
            <Text style={[TextTheme.modalHeadingThree, styles.messageText]} testID={testIdWithKey('RequestProcessing')}>
              {t('ProofRequest.RequestProcessing')}
            </Text>
          </View>

          <View style={[styles.image]}>
            <PersonCredentialSpinner />
          </View>
          <Text style={[TextTheme.normal, styles.messageText]}>This can take a few seconds</Text>
        </ScrollView>
        <View style={[styles.controlsContainer]}>
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
