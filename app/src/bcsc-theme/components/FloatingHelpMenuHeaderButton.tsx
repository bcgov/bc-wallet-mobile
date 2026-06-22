import { HelpCentreUrl } from '@/constants'
import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { ReactNode, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRestartVerification } from '../hooks/useRestartVerification'
import { BCSCScreens } from '../types/navigators'
import FloatingHelpMenu, { FloatingHelpMenuRef } from './FloatingHelpMenu'
import { ListButton, ListButtonGroup, ListButtonProps } from './ListButton'
import { ReportProblemModal } from './ReportProblemModal'

type FloatingHelpMenuButtonProps = {
  // ListButton rows; falsy children are filtered out by ListButtonGroup so rows can be conditional
  children: ReactNode
  ref?: React.Ref<FloatingHelpMenuRef>
}

/**
 * Renders a floating help menu button in the header, which opens a menu with provided options when pressed.
 *
 * @param props - The props for the FloatingHelpMenuButton component, including the menu options as children.
 * @returns The FloatingHelpMenuButton component with an IconButton and a FloatingHelpMenu.
 */
const FloatingHelpMenuButton = (props: FloatingHelpMenuButtonProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        buttonLocation={ButtonLocation.Right}
        icon={'help-circle-outline'}
        accessibilityLabel={t('BCSC.HelpMenu.AccessibilityLabel')}
        testID={testIdWithKey('HelpMenu')}
        onPress={() => setOpen(true)}
      />
      <FloatingHelpMenu ref={props.ref} open={open} onClose={() => setOpen(false)}>
        <ListButtonGroup>{props.children}</ListButtonGroup>
      </FloatingHelpMenu>
    </>
  )
}

/**
 * Every stack's WebView screen accepts the same `{ url, title }` params, so the floating menu
 * can navigate to whichever one belongs to the stack it is rendered in with full type safety.
 */
type WebViewParamList = {
  [BCSCScreens.MainWebView]: { url: string; title: string }
  [BCSCScreens.AuthWebView]: { url: string; title: string }
  [BCSCScreens.OnboardingWebView]: { url: string; title: string }
  [BCSCScreens.VerifyWebView]: { url: string; title: string }
  [BCSCScreens.PromptWebView]: { url: string; title: string }
}

type FloatingHelpMenuButtonOptions = {
  /** The current stack's WebView screen that the "Learn More" option should open. */
  webViewScreen: keyof WebViewParamList
  /** Help centre article opened by "Learn More". Defaults to the help centre home page. */
  learnMoreUrl?: HelpCentreUrl
  /** Show the "Restart verification process" option. Only valid within the verification flow. */
  showRestartVerification?: boolean
}

type RestartVerificationListButtonProps = {
  /** Called when the user confirms the restart, so the owning menu can close itself. */
  onConfirm: () => void
} & Pick<ListButtonProps, 'position'>

/**
 * "Restart verification process" menu row. Kept as its own component so the verification-reset
 * hooks only run in menus that opt in via `showRestartVerification` (i.e. the verify flow).
 */
const RestartVerificationListButton = ({ onConfirm, position }: RestartVerificationListButtonProps) => {
  const { t } = useTranslation()
  const promptRestartVerification = useRestartVerification()

  return (
    <ListButton position={position} onPress={() => promptRestartVerification(onConfirm)}>
      {t('BCSC.HelpMenu.RestartVerification')}
    </ListButton>
  )
}

/**
 * Factory function to create a floating help menu button for a stack header.
 *
 * The returned header component renders a help menu whose "Learn More" option opens the given
 * help centre article in the stack's WebView screen.
 *
 * @param options - The stack's WebView screen and the optional help centre article for "Learn More".
 * @returns A React component that renders a floating help menu button.
 */
export const createFloatingHelpMenuButton = ({
  webViewScreen,
  learnMoreUrl = HelpCentreUrl.HOME,
  showRestartVerification = false,
}: FloatingHelpMenuButtonOptions) => {
  const FloatingHelpMenuHeaderRight = () => {
    const { t } = useTranslation()
    const navigation = useNavigation<StackNavigationProp<WebViewParamList>>()
    const floatingHelpMenuRef = useRef<FloatingHelpMenuRef>(null)
    const [reportProblemVisible, setReportProblemVisible] = useState(false)

    const handleLearnMore = useCallback(() => {
      navigation.navigate(webViewScreen, { url: learnMoreUrl, title: t('HelpCentre.Title') })
      floatingHelpMenuRef.current?.close()
    }, [navigation, t])

    const handleReportProblem = useCallback(() => {
      // Close the help menu first, then open the fully-custom report modal once the menu has finished
      // animating out, so two React Native modals aren't presented at the same time.
      floatingHelpMenuRef.current?.close(() => setReportProblemVisible(true))
    }, [])

    return (
      <>
        <FloatingHelpMenuButton ref={floatingHelpMenuRef}>
          <ListButton onPress={handleLearnMore}>{t('BCSC.HelpMenu.LearnMore')}</ListButton>
          <ListButton
            onPress={() => {
              // TODO (V4.1.x): Implement Give Feedback page and link here
              floatingHelpMenuRef.current?.close()
            }}
          >
            {t('BCSC.HelpMenu.GiveFeedback')}
          </ListButton>
          <ListButton onPress={handleReportProblem}>{t('BCSC.HelpMenu.ReportProblem')}</ListButton>
          {showRestartVerification && (
            <RestartVerificationListButton onConfirm={() => floatingHelpMenuRef.current?.close()} />
          )}
        </FloatingHelpMenuButton>
        <ReportProblemModal visible={reportProblemVisible} onClose={() => setReportProblemVisible(false)} />
      </>
    )
  }

  return FloatingHelpMenuHeaderRight
}
