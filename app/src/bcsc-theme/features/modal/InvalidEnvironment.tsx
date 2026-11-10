import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { useSwitchEnvironment } from '@/bcsc-theme/hooks/useSwitchEnvironment'
import { CONTACT_US_HELP_URL } from '@/constants'
import usePreventGestureBack from '@/hooks/usePreventGestureBack'
import { TestIds } from '@/test-ids/registry'
import { IASEnvironment } from '@/utils/environment'
import { openLink } from '@/utils/links'
import { Button, ButtonType, Link, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'

/**
 * Full screen modal displayed when a production app is set to a non-production environment.
 * The only way forward is to reset the app back to the production environment.
 *
 * @returns The InvalidEnvironment component.
 */
export const InvalidEnvironment = (): React.ReactElement => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const switchEnvironment = useSwitchEnvironment()
  const [resetting, setResetting] = useState(false)

  usePreventGestureBack()

  const handleReset = useCallback(async () => {
    setResetting(true)
    await switchEnvironment(IASEnvironment.PROD)
    setResetting(false)
  }, [switchEnvironment])

  const styles = StyleSheet.create({
    content: {
      // flexGrow lets the content fill the viewport so the controls stay pinned to the bottom.
      flexGrow: 1,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    icon: {
      alignSelf: 'center',
      marginBottom: Spacing.sm,
    },
  })

  const buttonText = t('BCSC.Modals.InvalidEnvironment.ResetButton')

  const controls = (
    <ControlContainer>
      <Button
        title={buttonText}
        buttonType={ButtonType.Primary}
        onPress={handleReset}
        disabled={resetting}
        accessibilityLabel={buttonText}
        testID={testIdWithKey(TestIds.systemModal.invalidEnvironment.reset)}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      edges={['bottom', 'left', 'right']}
      scrollViewContainerStyle={styles.content}
    >
      <Icon name="restart-alt" size={200} color={ColorPalette.brand.icon} style={styles.icon} />
      <ThemedText variant="headingThree">{t('BCSC.Modals.InvalidEnvironment.Header')}</ThemedText>
      <ThemedText>{t('BCSC.Modals.InvalidEnvironment.ContentA')}</ThemedText>
      <ThemedText>{t('BCSC.Modals.InvalidEnvironment.ContentB')}</ThemedText>
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
    </ScreenWrapper>
  )
}
