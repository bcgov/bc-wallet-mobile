import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useTranslation } from 'react-i18next'

type HelpHeaderButtonProps = {
  helpAction?: () => void
}

// Currying function to avoid re-rendering in nav stacks
const createHelpHeaderButton = ({ helpAction }: HelpHeaderButtonProps) => {
  // Declared so that it has a display name for debugging purposes
  const HeaderRight = () => {
    const { t } = useTranslation()

    return (
      <IconButton
        buttonLocation={ButtonLocation.Right}
        icon={'help-circle'}
        accessibilityLabel={t('PersonCredential.HelpLink')}
        testID={testIdWithKey('Help')}
        onPress={() => helpAction && helpAction()}
      />
    )
  }
  return HeaderRight
}

export default createHelpHeaderButton
