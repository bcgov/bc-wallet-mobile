import {
  Button,
  ButtonType,
  CheckBoxRow,
  DeveloperModal,
  DispatchAction,
  Link,
  ScreenWrapper,
  testIdWithKey,
  useDeveloperMode,
  useStore,
  useTheme,
} from '@bifold/core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Pressable, Text, Vibration } from 'react-native'

const Preface: React.FC = () => {
  const [, dispatch] = useStore()
  const [checked, setChecked] = useState(false)
  const [devModalVisible, setDevModalVisible] = useState(false)
  const onBackPressed = () => setDevModalVisible(false)
  const onDevModeTriggered = () => {
    Vibration.vibrate()
    setDevModalVisible(true)
  }
  const { incrementDeveloperMenuCounter } = useDeveloperMode(onDevModeTriggered)
  const { t } = useTranslation()
  const { Assets, TextTheme, Spacing } = useTheme()

  const onSubmitPressed = () => {
    dispatch({
      type: DispatchAction.DID_SEE_PREFACE,
    })
  }

  const onPressInfoLink = () => {
    Linking.openURL('https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet#where')
  }

  const onPressShowcaseLink = () => {
    Linking.openURL('https://digital.gov.bc.ca/digital-trust/showcase/')
  }

  const controls = (
    <>
      <CheckBoxRow
        title={t('Preface.Confirmed')}
        accessibilityLabel={t('Terms.IAgree')}
        testID={testIdWithKey('IAgree')}
        checked={checked}
        onPress={() => setChecked(!checked)}
        reverse
        titleStyle={{ fontWeight: 'bold' }}
      />
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey('Continue')}
        disabled={!checked}
        onPress={onSubmitPressed}
        buttonType={ButtonType.Primary}
      />
    </>
  )

  return (
    <ScreenWrapper controls={controls}>
      <Assets.svg.preface style={{ alignSelf: 'center', marginBottom: Spacing.lg }} height={200} />
      <Pressable onPress={incrementDeveloperMenuCounter} testID={testIdWithKey('DeveloperCounter')}>
        <Text style={TextTheme.headingTwo}>{t('Preface.PrimaryHeading')}</Text>
      </Pressable>
      <Text style={[TextTheme.normal, { marginVertical: Spacing.md }]}>{t('Preface.Paragraph1')}</Text>
      <Link style={{ marginVertical: Spacing.md }} onPress={onPressInfoLink} linkText={t('Preface.Link1')} />
      <Text style={[TextTheme.normal, { marginTop: Spacing.md }]}>{t('Preface.Paragraph2')}</Text>
      <Link onPress={onPressShowcaseLink} linkText={`${t('Preface.Link2')}.`} />
      {devModalVisible ? <DeveloperModal onBackPressed={onBackPressed} /> : null}
    </ScreenWrapper>
  )
}

export default Preface
