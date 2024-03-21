import { ProofState } from '@aries-framework/core'
import { useAgent, useProofByState } from '@aries-framework/react-hooks'
import { useConfiguration, useStore, useTheme, Button, ButtonType, testIdWithKey } from '@hyperledger/aries-bifold-core'
import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import PersonIssuance1 from '../assets/img/PersonIssuance1.svg'
import PersonIssuance2 from '../assets/img/PersonIssuance2.svg'
import LoadingIcon from '../components/LoadingIcon'
import { credentialsMatchForProof } from '../helpers/Attestation'
import { startFlow } from '../helpers/BCIDHelper'
import { BCState } from '../store'

export default function PersonCredential() {
  const { agent } = useAgent()
  const [store] = useStore<BCState>()
  const [appInstalled, setAppInstalled] = useState<boolean>(false)
  const [workflowInProgress, setWorkflowInProgress] = useState<boolean>(false)
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()
  const [remoteAgentConnectionId, setRemoteAgentConnectionId] = useState<string | undefined>()
  const [didStartAttestationWorkflow, setDidStartAttestationWorkflow] = useState(false)
  const { useAttestation } = useConfiguration()
  const { loading: attestationLoading } = useAttestation ? useAttestation() : { loading: false }
  const receivedProofRequests = useProofByState(ProofState.RequestReceived)

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

  useEffect(() => {
    isBCServicesCardInstalled().then((result) => {
      setAppInstalled(result)
    })
  }, [])

  useEffect(() => {
    if (!attestationLoading && !didStartAttestationWorkflow) {
      setDidStartAttestationWorkflow(true)

      return
    }

    const acceptAttestationProofRequest = async () => {
      if (!attestationLoading && didStartAttestationWorkflow && remoteAgentConnectionId) {
        const proofRequest = receivedProofRequests.find((proof) => proof.connectionId === remoteAgentConnectionId)
        if (proofRequest) {
          const credentials = await credentialsMatchForProof(agent!, proofRequest)
          await agent?.proofs.acceptRequest({
            proofRecordId: proofRequest.id,
            proofFormats: credentials,
          })
        }
      }
    }

    acceptAttestationProofRequest()
      .then(() => {
        agent!.config.logger.info(`Accepted IDIM attestation proof request.`)
      })
      .catch((error) => {
        agent!.config.logger.error(`Unable to accept IDIM attestation proof request, error: ${error.message}`)
      })
  }, [attestationLoading, receivedProofRequests])

  const acceptPersonCredentialOffer = useCallback(() => {
    setWorkflowInProgress(true)
    startFlow(agent!, store, setWorkflowInProgress, t, setRemoteAgentConnectionId)
  }, [])

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
