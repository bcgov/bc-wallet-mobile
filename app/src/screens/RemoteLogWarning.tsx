import { useTheme, testIdWithKey, CheckBoxRow, Button, ButtonType, Link, FauxHeader } from '@bifold/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ErrorTextBox from '@components/ErrorTextBox'

type RemoteLogWarningProps = {
  onBackPressed: () => void
  onEnablePressed: () => void
}

const RemoteLogWarning: React.FC<RemoteLogWarningProps> = ({ onBackPressed, onEnablePressed }) => {
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()
  const { TextTheme, ColorPallet, NavigationTheme } = useTheme()

  const onSubmitPressed = () => {
    onEnablePressed()
  }

  const onPressPrivacyPolicyLink = () => {
    Linking.openURL('https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/privacy')
  }

  const style = StyleSheet.create({
    screenContainer: {
      flex: 1,
      marginTop: 10,
      padding: 20,
      justifyContent: 'space-between',
    },
    // No properties needed, just helpful labels
    contentContainer: {},
    controlsContainer: {},
  })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NavigationTheme.colors.primary }} edges={['top', 'right', 'left']}>
      <SafeAreaView style={{ flex: 1, backgroundColor: ColorPallet.brand.primaryBackground }} edges={['bottom']}>
        <FauxHeader title={t('RemoteLogging.ScreenTitle')} onBackPressed={onBackPressed} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: ColorPallet.brand.primaryBackground }}>
          <View style={style.screenContainer}>
            <View style={style.contentContainer}>
              <Text style={[TextTheme.headingTwo, { marginBottom: 10 }]}>{t('RemoteLogging.Heading')}</Text>
              <Text style={[TextTheme.normal, { marginTop: 10, marginBottom: 0 }]}>
                {t('RemoteLogging.CollectionNoticePart1')}
                <Text style={[TextTheme.normal, { fontWeight: 'bold' }]}>
                  {t('RemoteLogging.CollectionNoticeBold')}
                </Text>
                <Text style={TextTheme.normal}>{t('RemoteLogging.CollectionNoticePart2')}</Text>
              </Text>
              <Link
                style={{ marginBottom: 20 }}
                onPress={onPressPrivacyPolicyLink}
                linkText={t('RemoteLogging.CollectionNoticeLink')}
              />
              <ErrorTextBox>{t('RemoteLogging.CollectionNoticeWarning')}</ErrorTextBox>
            </View>
            <View style={style.controlsContainer}>
              <CheckBoxRow
                title={t('RemoteLogging.CheckBoxTitle')}
                accessibilityLabel={t('RemoteLogging.IAgree')}
                testID={testIdWithKey('IAgree')}
                checked={checked}
                onPress={() => setChecked(!checked)}
                reverse
                titleStyle={{ textAlign: 'right' }}
              />
              <View style={{ paddingTop: 10 }}>
                <Button
                  title={t('RemoteLogging.ButtonTitle')}
                  accessibilityLabel={t('RemoteLogging.ButtonTitle')}
                  testID={testIdWithKey('TurnOn')}
                  disabled={!checked}
                  onPress={onSubmitPressed}
                  buttonType={ButtonType.Primary}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaView>
  )
}

export default RemoteLogWarning
