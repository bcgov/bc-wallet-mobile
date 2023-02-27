import { useAgent } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import { Button, ButtonType, Screens, useStore, useTheme } from 'aries-bifold'
import React, { ReducerAction, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  Linking,
  ScrollView,
  SafeAreaView,
} from 'react-native'

import LoadingIcon from '../components/LoadingIcon'
import { startFlow } from '../helpers/BCIDHelper'
import { BCDispatchAction, BCState } from '../store'

const PersonCredentialScreen: React.FC = () => {
  const [workflowInFlight, setWorkflowInFlight] = useState<boolean>(false)
  const { agent } = useAgent()
  const navigation = useNavigation()
  const [store, dispatch] = useStore<BCState>()

  const paddingHorizontal = 10
  const transparent = 'rgba(0,0,0,0)'
  const borderRadius = 15
  const borderPadding = 8
  const { width } = Dimensions.get('window')
  const cardHeight = width / 2 // a card height is half of the screen width
  const cardHeaderHeight = cardHeight / 4 // a card has a total of 4 rows, and the header occupy 1 row

  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
    },
    pageContent: {
      marginHorizontal: 20,
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    pageTextContainer: {
      display: 'flex',
      flexDirection: 'row',
    },
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      height: cardHeight,
      paddingTop: 15,
      marginBottom: 20,
    },
    outerHeaderContainer: {
      flexDirection: 'column',
      backgroundColor: transparent,
      height: cardHeaderHeight + borderPadding,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    },
    innerHeaderContainer: {
      flexDirection: 'row',
      margin: borderPadding,
      backgroundColor: transparent,
    },
    buttonContainer: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      marginBottom: 20,
    },
    button: {
      marginBottom: 15,
    },
    flexGrow: {
      flexGrow: 1,
    },
  })

  const startGetBCIDCredentialWorkflow = useCallback(() => {
    setWorkflowInFlight(true)
    startFlow(agent!, store, dispatch as React.Dispatch<ReducerAction<any>>, setWorkflowInFlight, t)
  }, [])

  const dismissPersonCredentialOffer = useCallback(() => {
    dispatch({
      type: BCDispatchAction.PERSON_CREDENTIAL_OFFER_DISMISSED,
      payload: [{ personCredentialOfferDismissed: true }],
    })
    navigation.navigate(Screens.Home as never)
  }, [])

  const getBCServicesCardApp = useCallback(() => {
    return Linking.openURL(
      'https://www2.gov.bc.ca/gov/content/governments/government-id/bcservicescardapp/download-app'
    )
  }, [])

  return (
    <SafeAreaView style={styles.pageContainer}>
      <ScrollView contentContainerStyle={[styles.pageContent]}>
        <View>
          {/* <View style={[styles.container]}>
            <View style={[styles.flexGrow]}>
              <ImageBackground
                source={require('../assets/branding/service-bc-id-card.png')}
                style={[styles.flexGrow]}
                imageStyle={{ borderRadius }}
              >
                <View style={[styles.outerHeaderContainer]}>
                  <View style={[styles.innerHeaderContainer]}>
                    <Image
                      source={require('../assets/branding/service-bc-header-logo.png')}
                      style={{
                        flex: 1,
                        resizeMode: 'contain',
                        maxHeight: styles.outerHeaderContainer.height - borderPadding,
                      }}
                    />
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        TextTheme.label,
                        {
                          color: ColorPallet.grayscale.white,
                          paddingHorizontal: 0.5 * paddingHorizontal,
                          flex: 3,
                          textAlignVertical: 'center',
                        },
                      ]}
                      maxFontSizeMultiplier={1}
                    >
                      {t('PersonCredential.Issuer')}
                    </Text>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        TextTheme.label,
                        {
                          color: ColorPallet.grayscale.white,
                          textAlign: 'right',
                          paddingHorizontal: 0.5 * paddingHorizontal,
                          flex: 4,
                          textAlignVertical: 'center',
                        },
                      ]}
                      maxFontSizeMultiplier={1}
                    >
                      {t('PersonCredential.Name')}
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </View>
          </View> */}
          <View>
            <Text style={TextTheme.normal}>
              {t('PersonCredential.Description') + ' '}
              <TouchableOpacity onPress={getBCServicesCardApp}>
                <Text style={{ ...TextTheme.normal, color: ColorPallet.brand.link }}>
                  {t('PersonCredential.LinkDescription')}
                </Text>
              </TouchableOpacity>
            </Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <View style={styles.button}>
            <Button
              title={t('PersonCredential.GetCredential')}
              accessibilityLabel={t('PersonCredential.GetCredential')}
              onPress={startGetBCIDCredentialWorkflow}
              disabled={workflowInFlight}
              buttonType={ButtonType.Primary}
            >
              {workflowInFlight && (
                <LoadingIcon color={ColorPallet.grayscale.white} size={35} active={workflowInFlight} />
              )}
            </Button>
          </View>
          <View style={styles.button}>
            <Button
              title={t('PersonCredential.Decline')}
              accessibilityLabel={t('PersonCredential.Decline')}
              onPress={dismissPersonCredentialOffer}
              buttonType={ButtonType.Secondary}
            ></Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default PersonCredentialScreen
