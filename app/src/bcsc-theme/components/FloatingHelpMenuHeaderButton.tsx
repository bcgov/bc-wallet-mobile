import { HelpCentreUrl } from '@/constants'
import { ButtonLocation, IconButton, testIdWithKey } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { ReactElement, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCScreens } from '../types/navigators'
import FloatingHelpMenu, { FloatingHelpMenuRef } from './FloatingHelpMenu'
import { ListButton, ListButtonGroup, ListButtonProps } from './ListButton'

type FloatingHelpMenuButtonProps = {
  children: ReactElement<ListButtonProps> | ReactElement<ListButtonProps>[]
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
}

type FloatingHelpMenuButtonOptions = {
  /** The current stack's WebView screen that the "Learn More" option should open. */
  webViewScreen: keyof WebViewParamList
  /** Help centre article opened by "Learn More". Defaults to the help centre home page. */
  learnMoreUrl?: HelpCentreUrl
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
}: FloatingHelpMenuButtonOptions) => {
  const FloatingHelpMenuHeaderRight = () => {
    const { t } = useTranslation()
    const navigation = useNavigation<StackNavigationProp<WebViewParamList>>()
    const floatingHelpMenuRef = useRef<FloatingHelpMenuRef>(null)

    const handleLearnMore = useCallback(() => {
      navigation.navigate(webViewScreen, { url: learnMoreUrl, title: t('HelpCentre.Title') })
      floatingHelpMenuRef.current?.close()
    }, [navigation, t])

    return (
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
        <ListButton
          onPress={() => {
            // TODO (V4.1.x): Implement Report a Problem page and link here
            floatingHelpMenuRef.current?.close()
          }}
        >
          {t('BCSC.HelpMenu.ReportProblem')}
        </ListButton>
      </FloatingHelpMenuButton>
    )
  }

  return FloatingHelpMenuHeaderRight
}
