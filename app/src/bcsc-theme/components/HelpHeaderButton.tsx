import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useTranslation } from 'react-i18next'

const HelpHeaderButton = () => {
  const { t } = useTranslation()

  return (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      icon={'help-circle'}
      accessibilityLabel={t('PersonCredential.HelpLink')}
      testID={testIdWithKey('Help')}
      onPress={() => null}
    />
  )
}

export default HelpHeaderButton
