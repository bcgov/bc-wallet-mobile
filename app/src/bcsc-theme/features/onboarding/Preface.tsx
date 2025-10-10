import { Button, ButtonType, CheckBoxRow, DispatchAction, testIdWithKey, useStore } from '@bifold/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, Text } from 'react-native'

const Preface: React.FC = () => {
  const [, dispatch] = useStore()
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()

  const onSubmitPressed = () => {
    dispatch({
      type: DispatchAction.DID_SEE_PREFACE,
    })
  }

  return (
    <SafeAreaView>
      <Text>Preface</Text>
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
        //disabled={!checked}
        onPress={onSubmitPressed}
        buttonType={ButtonType.Primary}
      />
    </SafeAreaView>
  )
}

export default Preface
