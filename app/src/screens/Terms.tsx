import {
  Button,
  ButtonType,
  CheckBoxRow,
  DispatchAction,
  AuthenticateStackParams,
  Screens,
  testIdWithKey,
  useTheme,
  useStore,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import HeaderText from '../components/HeaderText'
import Progress from '../components/Progress'
import { AccordionItem } from '../components/react-native-accordion-list-view'

export const TermsVersion = '2'

const Terms = () => {
  const [store, dispatch] = useStore()
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthenticateStackParams>>()
  const { ColorPallet, TextTheme } = useTheme()
  const style = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      paddingHorizontal: 20,
      flex: 1,
    },
    bodyText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    titleText: {
      ...TextTheme.normal,
      textDecorationLine: 'underline',
    },
    title: {
      ...TextTheme.title,
    },
    controlsContainer: {
      marginTop: 'auto',
      marginBottom: 20,
    },
    paragraph: {
      flexDirection: 'row',
      marginTop: 20,
    },
    enumeration: {
      ...TextTheme.normal,
      marginRight: 25,
    },
    link: {
      ...TextTheme.normal,
      color: ColorPallet.brand.link,
      textDecorationLine: 'underline',
      fontWeight: 'bold',
    },
    headerText: {
      ...TextTheme.headingTwo,
      color: ColorPallet.notification.infoText,
      marginTop: 16,
    },
    progressContainer: {
      marginTop: 25,
    },
  })

  const onSubmitPressed = useCallback(() => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: TermsVersion }],
    })

    navigation.navigate(Screens.CreatePIN)
  }, [])

  return (
    <View style={[style.container]}>
      {!(store.onboarding.didAgreeToTerms && store.authentication.didAuthenticate) && (
        <View style={style.progressContainer}>
          <View style={{ marginHorizontal: 50 }}>
            <Progress progressPercent={33.3333} progressText={t('TermsV2.ProgressBarText')} progressFill="primary" />
          </View>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false}>
        {!(store.onboarding.didAgreeToTerms && store.authentication.didAuthenticate) && (
          <HeaderText title={t('Screens.Terms')} />
        )}
        <Text style={[style.title, { marginTop: 20 }]}>{t('TermsV2.Consent.title')}</Text>
        <Text style={[style.bodyText, { marginTop: 20 }]}>{t('TermsV2.Consent.body')}</Text>

        <Text style={[style.title, { marginTop: 20 }]}>{t('TermsV2.Consent.PersonalUse.title')}</Text>
        <Text style={[style.bodyText, { marginTop: 20, marginBottom: 20 }]}>
          {t('TermsV2.Consent.PersonalUse.body')}
        </Text>
        <AccordionItem
          customTitle={() => <Text style={[style.title]}>{t('TermsV2.Consent.PersonalUse.subsection.title')}</Text>}
          customBody={() => (
            <Text style={[style.bodyText, { margin: 20 }]}>{t('TermsV2.Consent.PersonalUse.subsection.body')}</Text>
          )}
        ></AccordionItem>

        <Text style={[style.title, { marginTop: 20 }]}>{t('TermsV2.Consent.IdentityTheft.title')}</Text>
        <Text style={[style.bodyText, { marginTop: 20, marginBottom: 20 }]}>
          {t('TermsV2.Consent.IdentityTheft.body')}
        </Text>
        <AccordionItem
          customTitle={() => <Text style={[style.title]}>{t('TermsV2.Consent.IdentityTheft.subsection.title')}</Text>}
          customBody={() => (
            <Text style={[style.bodyText, { margin: 20 }]}>{t('TermsV2.Consent.IdentityTheft.subsection.body')}</Text>
          )}
        ></AccordionItem>

        <Text style={[style.title, { marginTop: 20 }]}>{t('TermsV2.Consent.Privacy.title')}</Text>
        <Text style={[style.bodyText, { marginTop: 20, marginBottom: 20, marginVertical: 20 }]}>
          {t('TermsV2.Consent.Privacy.body')}
        </Text>
        <AccordionItem
          containerStyle={{ marginBottom: 20 }}
          customTitle={() => <Text style={[style.title]}>{t('TermsV2.Consent.Privacy.subsection.title')}</Text>}
          customBody={() => (
            <Text style={[style.bodyText, { margin: 20 }]}>{t('TermsV2.Consent.Privacy.subsection.body')}</Text>
          )}
        ></AccordionItem>

        <View style={[style.controlsContainer]}>
          {!(store.onboarding.didAgreeToTerms && store.authentication.didAuthenticate) && (
            <>
              <CheckBoxRow
                title={t('Terms.Attestation')}
                accessibilityLabel={t('Terms.IAgree')}
                testID={testIdWithKey('IAgree')}
                checked={checked}
                onPress={() => setChecked(!checked)}
              />
              <View style={[{ paddingTop: 10 }]}>
                <Button
                  title={t('Global.Continue')}
                  accessibilityLabel={t('Global.Continue')}
                  testID={testIdWithKey('Continue')}
                  disabled={!checked}
                  onPress={onSubmitPressed}
                  buttonType={ButtonType.Primary}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default Terms
