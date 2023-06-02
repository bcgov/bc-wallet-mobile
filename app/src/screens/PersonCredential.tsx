import { useAgent } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/native'
import { Button, ButtonType, Screens, useStore, useTheme, CredentialCard, TabStacks, testIdWithKey } from 'aries-bifold'
import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View, TouchableOpacity, Linking, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import LoadingIcon from '../components/LoadingIcon'
import { hitSlop } from '../constants'
import { startFlow } from '../helpers/BCIDHelper'
import { useCredentialOfferTrigger } from '../hooks/credential-offer-trigger'
import { BCDispatchAction, BCState } from '../store'

const PersonCredential: React.FC = () => {
  const { agent } = useAgent()
  const navigation = useNavigation()

  const [store, dispatch] = useStore<BCState>()
  const [workflowInProgress, setWorkflowInProgress] = useState<boolean>(false)
  const [workflowConnectionId, setWorkflowConnectionId] = useState<string | undefined>()

  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()

  useCredentialOfferTrigger(workflowConnectionId)

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
    },
    pageContent: {
      marginHorizontal: 20,
      flex: 1,
      flexGrow: 1,
    },
    credentialCardContainer: {
      marginVertical: 20,
    },
    button: {
      marginBottom: 15,
    },
  })

  const dismissPersonCredentialOffer = useCallback(() => {
    dispatch({
      type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
      payload: [{ personCredentialOfferDismissed: true }],
    })
    navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home })
  }, [])

  const acceptPersonCredentialOffer = useCallback(() => {
    setWorkflowInProgress(true)
    startFlow(agent!, store, setWorkflowInProgress, t, (connectionId) => setWorkflowConnectionId(connectionId))
  }, [])

  const getBCServicesCardApp = useCallback(() => {
    return Linking.openURL(
      'https://www2.gov.bc.ca/gov/content/governments/government-id/bcservicescardapp/download-app'
    )
  }, [])

  const personCredentialAttributes = {
    credName: 'Person',
    credDefId: 'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
    schemaId: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
    attributes: [
      { name: 'given_names', value: t('PersonCredential.GivenName') },
      { name: 'family_name', value: t('PersonCredential.FamilyName') },
    ],
  }

  const personPageFooter = () => {
    return (
      <View>
        <View style={styles.button}>
          <Button
            title={t('PersonCredential.GetCredential')}
            accessibilityLabel={t('PersonCredential.GetCredential')}
            onPress={acceptPersonCredentialOffer}
            disabled={workflowInProgress}
            buttonType={ButtonType.Primary}
          >
            {workflowInProgress && (
              <LoadingIcon color={ColorPallet.grayscale.white} size={35} active={workflowInProgress} />
            )}
          </Button>
        </View>
        <View style={styles.button}>
          <Button
            title={t('PersonCredential.Decline')}
            accessibilityLabel={t('PersonCredential.Decline')}
            onPress={dismissPersonCredentialOffer}
            disabled={workflowInProgress}
            buttonType={ButtonType.Secondary}
          ></Button>
        </View>
      </View>
    )
  }
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.pageContent}>
        <FlatList
          data={[personCredentialAttributes]}
          ListFooterComponent={personPageFooter}
          contentContainerStyle={{ flexGrow: 1 }}
          ListFooterComponentStyle={{ flex: 1, justifyContent: 'flex-end' }}
          renderItem={({ item }) => {
            return (
              <View>
                <View style={styles.credentialCardContainer}>
                  <CredentialCard credDefId={item.credDefId} schemaId={item.schemaId} displayItems={item.attributes} />
                </View>
                <Text style={TextTheme.normal}>
                  {t('PersonCredential.Description') + ' '}
                  <TouchableOpacity
                    onPress={getBCServicesCardApp}
                    hitSlop={hitSlop}
                    testID={testIdWithKey('GetBCServicesCardApp')}
                  >
                    <Text style={{ ...TextTheme.normal, color: ColorPallet.brand.link }}>
                      {t('PersonCredential.LinkDescription')}
                    </Text>
                  </TouchableOpacity>
                </Text>
              </View>
            )
          }}
        />
      </View>
    </SafeAreaView>
  )
}

export default PersonCredential
