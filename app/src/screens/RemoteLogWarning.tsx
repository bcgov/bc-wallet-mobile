import { useTheme, testIdWithKey, CheckBoxRow, Button, ButtonType, Link } from '@hyperledger/aries-bifold-core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type RemoteLogWarningProps = {
  onEnablePressed: () => void
  sessionId: number
}

const RemoteLogWarning: React.FC<RemoteLogWarningProps> = ({ onEnablePressed, sessionId }) => {
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()
  const { TextTheme } = useTheme()
  const paragraphText = t('RemoteLogging.Paragraph3').replace('{sessionId}', sessionId.toString())

  const onSubmitPressed = () => {
    onEnablePressed()
  }

  const onPressShowcaseLink = () => {
    Linking.openURL('https://digital.gov.bc.ca/digital-trust/showcase/')
  }

  const style = StyleSheet.create({
    screenContainer: {
      flex: 1,
      marginTop: 35,
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
            <Text style={[TextTheme.headingTwo]}>{t('RemoteLogging.ScreenTitle')}</Text>
            <Text style={[TextTheme.normal, { marginTop: 10, marginBottom: 10 }]}>{t('RemoteLogging.Paragraph1')}</Text>
            <Text style={[TextTheme.normal, { marginTop: 10 }]}>
              {t('RemoteLogging.Paragraph2')}
              <Link onPress={onPressShowcaseLink} linkText={`${'Privacy Policy'}.`} />
            </Text>
            <Text style={[TextTheme.normal, { marginTop: 10 }]}>{paragraphText}</Text>
          </View>
          <View style={style.controlsContainer}>
            <CheckBoxRow
              title={t('RemoteLogging.CheckBoxTitle')}
              accessibilityLabel={t('RemoteLogging.IAgree')}
              testID={testIdWithKey('IAgree')}
              checked={checked}
              onPress={() => setChecked(!checked)}
              reverse
              titleStyle={{ fontWeight: 'bold' }}
            />
            <View style={[{ paddingTop: 10 }]}>
              <Button
                title={t('RemoteLogging.ButtonTitle')}
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

export default RemoteLogWarning
