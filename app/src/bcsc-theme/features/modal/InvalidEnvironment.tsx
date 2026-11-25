import { useSwitchEnvironment } from '@/bcsc-theme/hooks/useSwitchEnvironment'
import { CONTACT_US_HELP_URL } from '@/constants'
import { useAlerts } from '@/hooks/useAlerts'
import { TestIds } from '@/test-ids/registry'
import { IASEnvironment } from '@/utils/environment'
import { openLink } from '@/utils/links'
import { Link, testIdWithKey, ThemedText } from '@bifold/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SystemModal } from './components/SystemModal'

/**
 * Full screen modal displayed when a production app is set to a non-production environment.
 * The only way forward is to reset the app back to the production environment.
 *
 * @returns The InvalidEnvironment component.
 */
export const InvalidEnvironment = (): React.ReactElement => {
  const { t } = useTranslation()
  const switchEnvironment = useSwitchEnvironment()
  const { unknownErrorModal } = useAlerts()
  const [resetting, setResetting] = useState(false)

  const handleReset = useCallback(async () => {
    setResetting(true)
    const switched = await switchEnvironment(IASEnvironment.PROD)

    if (!switched) {
      unknownErrorModal(new Error('[InvalidEnvironment] Failed to switch to production environment'))
    }

    setResetting(false)
  }, [switchEnvironment, unknownErrorModal])

  return (
    <SystemModal
      iconName="error-outline"
      iconSize={75}
      headerText={t('BCSC.Modals.InvalidEnvironment.Header')}
      contentText={[t('BCSC.Modals.InvalidEnvironment.ContentA'), t('BCSC.Modals.InvalidEnvironment.ContentB')]}
      buttonText={t('BCSC.Modals.InvalidEnvironment.ResetButton')}
      onButtonPress={handleReset}
      buttonDisabled={resetting}
      // Rendered at the root without a navigation header, so the top inset is ours to handle
      edges={['top', 'bottom', 'left', 'right']}
      testID={testIdWithKey(TestIds.systemModal.invalidEnvironment.reset)}
    >
      <ThemedText>
        {t('BCSC.Modals.InvalidEnvironment.NeedHelpPrefix')}
        <Link
          linkText={t('BCSC.Modals.InvalidEnvironment.ContactUsLink')}
          onPress={() => openLink(CONTACT_US_HELP_URL)}
          textProps={{ accessibilityHint: t('Global.A11y.OpensInBrowser') }}
          testID={testIdWithKey(TestIds.systemModal.invalidEnvironment.contactUs)}
        />
        {t('BCSC.Modals.InvalidEnvironment.NeedHelpSuffix')}
      </ThemedText>
    </SystemModal>
  )
}
