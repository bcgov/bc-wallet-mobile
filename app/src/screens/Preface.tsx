import {
  useTheme,
  useStore,
  testIdWithKey,
  DispatchAction,
  AuthenticateStackParams,
  Screens,
  CheckBoxRow,
  Button,
  ButtonType,
  Link,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const Preface: React.FC = () => {
  const [, dispatch] = useStore()
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthenticateStackParams>>()
  const { Assets, OnboardingTheme, TextTheme } = useTheme()
  const onSubmitPressed = () => {
    dispatch({
      type: DispatchAction.DID_SEE_PREFACE,
    })
    navigation.navigate(Screens.Onboarding)
  }
  const onPressInfoLink = () => {
    Linking.openURL('https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet#where')
  }
  const onPressShowcaseLink = () => {
    Linking.openURL('https://digital.gov.bc.ca/digital-trust/showcase/')
  }

  const style = StyleSheet.create({
    screenContainer: {
      ...OnboardingTheme.container,
      height: '100%',
      padding: 20,
      justifyContent: 'space-between',
    },

    // No properties needed, just helpful labels
    contentContainer: {},
    controlsContainer: {},
  })

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={style.screenContainer}>
          <View style={style.contentContainer}>
            <Assets.svg.preface style={{ alignSelf: 'center', marginBottom: 20 }} height={200} />
            <Text style={[TextTheme.headingTwo]}>{t('Preface.PrimaryHeading')}</Text>
            <Text style={[TextTheme.normal, { marginTop: 10, marginBottom: 10 }]}>{t('Preface.Paragraph1')}</Text>
            <Link style={{ marginTop: 10, marginBottom: 10 }} onPress={onPressInfoLink} linkText={t('Preface.Link1')} />
            <Text style={[TextTheme.normal, { marginTop: 10 }]}>{t('Preface.Paragraph2')}</Text>
            <Link onPress={onPressShowcaseLink} linkText={`${t('Preface.Link2')}.`} />
          </View>
          <View style={style.controlsContainer}>
            <CheckBoxRow
              title={t('Preface.Confirmed')}
              accessibilityLabel={t('Terms.IAgree')}
              testID={testIdWithKey('IAgree')}
              checked={checked}
              onPress={() => setChecked(!checked)}
              reverse
              titleStyle={{ fontWeight: 'bold' }}
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
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Preface
