import {
  useTheme,
  useStore,
  testIdWithKey,
  AuthenticateStackParams,
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

type RemoteLogWarningProps = {
  onEnablePressed: () => void
  sessionId: string
}

const RemoteLogWarning: React.FC<RemoteLogWarningProps> = ({ onEnablePressed, sessionId }) => {
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()
  const { TextTheme } = useTheme()

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
            <Text style={[TextTheme.headingTwo]}>{'Remote Logging'}</Text>
            <Text style={[TextTheme.normal, { marginTop: 10, marginBottom: 10 }]}>
              {
                'Only turn on remote logging if you are in a debugging session or if you are asked and agree to do so. This action will send logs to Technical Support at the Government of British Columbia.'
              }
            </Text>
            <Text style={[TextTheme.normal, { marginTop: 10 }]}>
              {
                'Logs are automatically deleted after three days. They are kept and used only for debugging, as outlined in our '
              }
              <Link onPress={onPressShowcaseLink} linkText={`${'Privacy Policy'}.`} />
            </Text>
            <Text
              style={[TextTheme.normal, { marginTop: 10 }]}
            >{`Provide the debug session id ${sessionId} to technical support.`}</Text>
          </View>
          <View style={style.controlsContainer}>
            <CheckBoxRow
              title={'I understand and wish to enable remote logging'}
              accessibilityLabel={'Yerp'}
              testID={testIdWithKey('IAgree')}
              checked={checked}
              onPress={() => setChecked(!checked)}
              reverse
              titleStyle={{ fontWeight: 'bold' }}
            />
            <View style={[{ paddingTop: 10 }]}>
              <Button
                title={'Turn on remote logging'}
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
