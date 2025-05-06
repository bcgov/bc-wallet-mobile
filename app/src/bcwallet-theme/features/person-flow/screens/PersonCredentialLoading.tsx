import { CredentialState } from '@credo-ts/core'
import { useAgent, useCredentialByState } from '@credo-ts/react-hooks'
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
  Stacks,
} from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, EmitterSubscription, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

import PersonCredentialSpinner from '../../../../components/PersonCredentialSpinner'
import {
  connectToIASAgent,
  authenticateWithServiceCard,
  WellKnownAgentDetails,
  initiateAppToAppFlow,
} from '../utils/BCIDHelper'
import { BCState } from '../../../../store'
import ProgressBar from '@/components/ProgressBar'
type PersonProps = StackScreenProps<NotificationStackParams, Screens.CustomNotification>

const PersonCredentialLoading: React.FC<PersonProps> = ({ navigation }) => {
  const { ColorPallet, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const [remoteAgentDetails, setRemoteAgentDetails] = useState<WellKnownAgentDetails | undefined>()
  const timer = useRef<NodeJS.Timeout>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const receivedCredentialOffers = useCredentialByState(CredentialState.OfferReceived)
  const [stepText, setStepText] = useState<string>('Starting process...')
  const [progressPercent, setProgressPercent] = useState(0)
  const { agent } = useAgent()
  if (!agent) {
    throw new Error('Unable to fetch agent from Credo')
  }
  const { t } = useTranslation()
  const [didCompleteAttestationProofRequest, setDidCompleteAttestationProofRequest] = useState<boolean>(false)

  const steps: string[] = useMemo(
    () => [
      t('PersonCredential.EstablishingConnection'),
      t('PersonCredential.ConnectedToAgent'),
      t('PersonCredential.WaitingForAppAttestation'),
      t('PersonCredential.AppAttested'),
      t('PersonCredential.OfferingCredential'),
      t('PersonCredential.InitiatingAppToAppFlow'),
    ],
    [t]
  )

  const setStep = useCallback(
    (stepIdx: number) => {
      setStepText(steps[stepIdx])
      const percent = Math.floor(((stepIdx + 1) / steps.length) * 100)
      setProgressPercent(percent)
    },
    [steps]
  )

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
    const connect = async () => {
      try {
        const remoteAgentDetails = await connectToIASAgent(agent, store.developer.environment.iasAgentInviteUrl, t)
        setRemoteAgentDetails(remoteAgentDetails)
        setStep(1)
        logger.info(`Connected to IAS agent, connectionId: ${remoteAgentDetails.connectionId}`)
      } catch (err) {
        logger.error(`Failed to connect to IAS agent, error: ${(err as BifoldError).message}`)
      }
    }

    connect()
  }, [agent, store.developer.environment.iasAgentInviteUrl, logger, t, setStep])

  // when a person credential offer is received, show the
  // offer screen to the user.
  const goToCredentialOffer = useCallback(
    (credentialId: string) => {
      navigation.getParent()?.navigate(Stacks.ConnectionStack, {
        screen: Screens.Connection,
        params: { credentialId },
      })
    },
    [navigation]
  )

  useEffect(() => {
    const handleFailedAttestation = (error: BifoldError) => {
      navigation.goBack()
      DeviceEventEmitter.emit(BifoldEventTypes.ERROR_ADDED, error)
    }

    const handleStartedAttestation = () => {
      setStep(2)
      logger.info('Attestation proof request started')
    }

    const handleStartedCompleted = () => {
      setStep(3)
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
  }, [navigation, logger, setStep])

  useEffect(() => {
    const legacyConnectionDid = remoteAgentDetails?.legacyConnectionDid

    if (!remoteAgentDetails || !legacyConnectionDid || !didCompleteAttestationProofRequest) {
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

    const iasPortalUrl = store.developer.environment.iasPortalUrl

    // only use app to app if in dev or test and feature is specifically enabled
    if (
      store.developer.enableAppToAppPersonFlow &&
      ['Development', 'Test'].includes(store.developer.environment.name)
    ) {
      initiateAppToAppFlow(store.developer.environment.appToAppUrl)
        .then(() => {
          setStep(5)
          logger.info('Initiated app-to-app flow')
        })
        .catch((error) => {
          logger.error('Failed to initiate app-to-app flow with error: ', error.message)
        })
    } else {
      authenticateWithServiceCard(legacyConnectionDid, iasPortalUrl, cb)
        .then(() => {
          setStep(4)
          logger.info('Completed service card authentication successfully')
        })
        .catch((error) => {
          logger.error('Completed service card authentication with error, error: ', error.message)
        })
    }
  }, [
    remoteAgentDetails,
    didCompleteAttestationProofRequest,
    logger,
    navigation,
    store.developer.environment.iasPortalUrl,
    store.developer.environment.name,
    store.developer.environment.appToAppUrl,
    store.developer.enableAppToAppPersonFlow,
    setStep,
  ])

  useEffect(() => {
    for (const credential of receivedCredentialOffers) {
      if (
        credential.state == CredentialState.OfferReceived &&
        credential.connectionId === remoteAgentDetails?.connectionId
      ) {
        goToCredentialOffer(credential.id)
      }
    }
  }, [receivedCredentialOffers, remoteAgentDetails, goToCredentialOffer])

  const onDismissModalTouched = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  return (
    <SafeAreaView style={{ backgroundColor: ColorPallet.brand.modalPrimaryBackground, flex: 1 }}>
      <ProgressBar progressPercent={progressPercent} />
      <ScrollView style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={[TextTheme.modalHeadingThree, styles.messageText]} testID={testIdWithKey('RequestProcessing')}>
            {stepText}
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
  )
}

export default PersonCredentialLoading
