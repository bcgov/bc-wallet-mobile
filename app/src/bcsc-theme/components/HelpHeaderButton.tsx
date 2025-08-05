import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

type HelpHeaderButtonProps = {
  helpUrl?: string
}

const HelpHeaderButton = ({ helpUrl }: HelpHeaderButtonProps) => {
  const { t } = useTranslation()

  return (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      icon={'help-circle'}
      accessibilityLabel={t('PersonCredential.HelpLink')}
      testID={testIdWithKey('Help')}
      onPress={() => helpUrl && Linking.openURL(helpUrl)}
    />
  )
}

export default HelpHeaderButton
