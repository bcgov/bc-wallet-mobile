import { ProofState, ProofExchangeRecord, CredentialState } from '@aries-framework/core'
import { useAgent, useProofByState, useCredentialByState } from '@aries-framework/react-hooks'
import {
  useConfiguration,
  useStore,
  useTheme,
  Button,
  ButtonType,
  testIdWithKey,
  BifoldAgent,
  Screens,
  Stacks,
  InfoTextBox,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import PersonIssuance1 from '../assets/img/PersonIssuance1.svg'
import PersonIssuance2 from '../assets/img/PersonIssuance2.svg'
import LoadingIcon from '../components/LoadingIcon'
import { getAvailableAttestationCredentials } from '../helpers/Attestation'
import { connectToIASAgent, authenticateWithServiceCard, WellKnownAgentDetails } from '../helpers/BCIDHelper'
import { BCState } from '../store'

const attestationProofRequestWaitTimeout = 10000

export default function PersonCredential() {
  const { agent } = useAgent()
  const [store] = useStore<BCState>()
  const [appInstalled, setAppInstalled] = useState<boolean>(false)
  const [workflowInProgress, setWorkflowInProgress] = useState<boolean>(false)
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()
  const { useAttestation } = useConfiguration()
  const receivedCredentialOffers = useCredentialByState(CredentialState.OfferReceived)
  const receivedProofRequests = useProofByState(ProofState.RequestReceived)
  const navigation = useNavigation()
  const [remoteAgentDetails, setRemoteAgentDetails] = useState<WellKnownAgentDetails | undefined>()
  const { loading: attestationLoading } = useAttestation ? useAttestation() : { loading: false }
  const [didCompleteAttestationProofRequest, sedDidCompleteAttestationProofRequest] = useState<boolean>(false)
  const timer = useRef<NodeJS.Timeout>()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
    },
    pageContent: {
      flex: 1,
      flexGrow: 1,
    },
    credentialCardContainer: {
      marginVertical: 20,
      display: 'flex',
      alignItems: 'center',
    },
    button: {
      marginBottom: 15,
    },
    section: {
      backgroundColor: ColorPallet.brand.secondaryBackground,
      paddingVertical: 24,
      paddingHorizontal: 25,
      marginTop: 10,
      flexGrow: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 10,
      display: 'flex',
    },
    sectionSecondaryAction: {
      display: 'flex',
      alignItems: 'center',
      marginTop: 10,
    },
    sectionSeparator: {
      marginBottom: 10,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexGrow: 1,
      paddingHorizontal: 25,
    },
    itemSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.primaryBackground,
      marginHorizontal: 25,
    },
  })

  const isBCServicesCardInstalled = async () => {
    return await Linking.canOpenURL('ca.bc.gov.id.servicescard://')
  }

  // Use this function to accept the attestation proof request.
  const acceptAttestationProofRequest = async (agent: BifoldAgent, proofRequest: ProofExchangeRecord) => {
    // Sanity check to make sure we have the necessary credentials
    const credential = await getAvailableAttestationCredentials(agent)
    if (credential.length === 0) {
      return false
    }

    // This will throw if we don't have the necessary credentials
    const credentials = await agent.proofs.selectCredentialsForRequest({
      proofRecordId: proofRequest.id,
    })

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
    isBCServicesCardInstalled().then((result) => {
      setAppInstalled(result)
    })
  }, [])

  const acceptPersonCredentialOffer = useCallback(() => {
    if (!agent || !store || !t) {
      return
    }

    // Start the Spinner and any text that indicates the workflow is in progress
    // and the user needs to wait.
    setWorkflowInProgress(true)

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
            agent.config.logger.info(
              `Waited ${attestationProofRequestWaitTimeout / 1000}sec on attestation proof request, continuing`
            )

            sedDidCompleteAttestationProofRequest(true)
          }
        }, attestationProofRequestWaitTimeout)

        agent.config.logger.error(`Connected to IAS agent, connectionId: ${remoteAgentDetails?.connectionId}`)
      })
      .catch((error) => {
        agent.config.logger.error(`Connected to connect to IAS agent, error: ${error.message}`)
      })
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

    acceptAttestationProofRequest(agent, proofRequest)
      .then((status: boolean) => {
        // We can unblock the workflow and proceed with
        // authentication.
        sedDidCompleteAttestationProofRequest(status)

        agent.config.logger.info(`Accepted IAS attestation proof request.`)
      })
      .catch((error) => {
        sedDidCompleteAttestationProofRequest(false)

        agent.config.logger.error(`Unable to accept IAS attestation proof request, error: ${error.message}`)
      })
  }, [attestationLoading, receivedProofRequests, remoteAgentDetails, agent])

  useEffect(() => {
    if (!remoteAgentDetails || !remoteAgentDetails.legacyConnectionDid || !didCompleteAttestationProofRequest) {
      return
    }

    const cb = (status: boolean) => {
      agent!.config.logger.error(`Service card authentication reported ${status}`)

      setWorkflowInProgress(false)
    }

    const { iasPortalUrl } = store.developer.environment
    const { legacyConnectionDid } = remoteAgentDetails

    authenticateWithServiceCard(legacyConnectionDid, iasPortalUrl, cb)
      .then(() => {
        agent!.config.logger.error('Completed service card authentication successfully')
      })
      .catch((error) => {
        agent!.config.logger.error('Completed service card authentication with errir, error: ', error.message)
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

  const getBCServicesCardApp = useCallback(() => {
    setAppInstalled(true)
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/id1234298467'
        : 'https://play.google.com/store/apps/details?id=ca.bc.gov.id.servicescard'
    return Linking.openURL(url)
  }, [])

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.pageContent}>
        <View style={styles.credentialCardContainer}>{appInstalled ? <PersonIssuance2 /> : <PersonIssuance1 />}</View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole={'header'}
              style={[
                TextTheme.headingThree,
                {
                  flexShrink: 1,
                  color: appInstalled ? ColorPallet.brand.primaryDisabled : TextTheme.headingThree.color,
                },
              ]}
            >
              {appInstalled ? t('PersonCredential.ServicesCardInstalled') : t('PersonCredential.InstallServicesCard')}
            </Text>
            {appInstalled && (
              <Icon
                name="check-circle"
                testID={testIdWithKey('AppInstalledIcon')}
                size={35}
                style={{ marginLeft: 10, color: ColorPallet.semantic.success }}
              />
            )}
          </View>
          {appInstalled ? null : (
            <View style={{ marginTop: 10 }}>
              <Button
                buttonType={ButtonType.Primary}
                onPress={getBCServicesCardApp}
                accessibilityLabel={t('PersonCredential.InstallApp')}
                testID={testIdWithKey('InstallApp')}
                title={t('PersonCredential.InstallApp')}
              />
              <TouchableOpacity
                onPress={() => setAppInstalled(true)}
                accessibilityLabel={t('PersonCredential.AppOnOtherDevice')}
                testID={testIdWithKey('AppOnOtherDevice')}
                style={styles.sectionSecondaryAction}
              >
                <Text style={{ ...TextTheme.bold, color: ColorPallet.brand.primary }}>
                  {t('PersonCredential.AppOnOtherDevice')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole={'header'}
              style={[
                TextTheme.headingThree,
                {
                  flexShrink: 1,
                  color: appInstalled ? TextTheme.headingThree.color : ColorPallet.brand.primaryDisabled,
                },
              ]}
            >
              {t('PersonCredential.CreatePersonCred')}
            </Text>
          </View>
          {workflowInProgress ? (
            <View style={{ marginBottom: 10 }}>
              <InfoTextBox>{t('PersonCredential.PleaseWait')}</InfoTextBox>
            </View>
          ) : null}
          {appInstalled ? (
            <Button
              buttonType={ButtonType.Primary}
              disabled={workflowInProgress}
              testID={testIdWithKey('StartProcess')}
              accessibilityLabel={t('PersonCredential.StartProcess')}
              title={t('PersonCredential.StartProcess')}
              onPress={acceptPersonCredentialOffer}
            >
              <View style={{ opacity: workflowInProgress ? 1 : 0, marginLeft: -18 }}>
                <LoadingIcon active={workflowInProgress} size={35} color={ColorPallet.brand.buttonText} />
              </View>
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
