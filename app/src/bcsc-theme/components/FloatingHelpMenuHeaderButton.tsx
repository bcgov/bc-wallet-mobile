import { FEEDBACK_URL, HelpCentreUrl } from '@/constants'
import { a11yLabel } from '@/utils/accessibility'
import { openLink } from '@/utils/links'
import { ButtonLocation, IconButton, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { ReactNode, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useLeaveVerification } from '../hooks/useLeaveVerification'
import { useRestartVerification } from '../hooks/useRestartVerification'
import { BCSCScreens } from '../types/navigators'
import FloatingHelpMenu, { FloatingHelpMenuRef } from './FloatingHelpMenu'
import { ListButton, ListButtonGroup, ListButtonProps } from './ListButton'
import { ReportProblemModal } from './ReportProblemModal'

// Header trigger icons. Every stack uses the question-mark help icon except the verification flow,
// whose menu also offers navigation actions ("Back to home", "Restart") and so reads better as a
// vertical-ellipsis "more options" affordance.
const DEFAULT_HELP_ICON = 'help-circle-outline'
const VERIFY_HELP_ICON = 'dots-vertical'

type FloatingHelpMenuButtonProps = {
  // ListButton rows; falsy children are filtered out by ListButtonGroup so rows can be conditional
  children: ReactNode
  ref?: React.Ref<FloatingHelpMenuRef>
  /** Header trigger icon (MaterialCommunityIcons/MaterialIcons glyph name). */
  icon: string
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
        icon={props.icon}
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
 * Report-a-problem modal state for a help menu. `open` closes the menu first and only shows the
 * modal once the dismissal completes (via the menu's `close(onClosed)` callback, then a frame
 * later): presenting both in the same commit triggers an iOS "attempt to present while a
 * presentation is in progress" race that can leave the report modal not showing. The modal itself
 * is rendered by the factory — outside the menu — so it outlives the menu's dismissal.
 */
const useReportProblem = (menuRef: React.RefObject<FloatingHelpMenuRef | null>) => {
  const [visible, setVisible] = useState(false)

  const open = useCallback(() => {
    menuRef.current?.close(() => requestAnimationFrame(() => setVisible(true)))
  }, [menuRef])

  const hide = useCallback(() => setVisible(false), [])

  return { visible, open, hide }
}

/**
 * Shared props for the self-contained verify-flow menu rows below. `position` is injected by
 * ListButtonGroup (for border-radius grouping); `onClose` lets a row dismiss the menu it lives in.
 */
type MenuRowProps = {
  /** Closes the owning menu (e.g. after the row's action runs). */
  onClose: () => void
} & Pick<ListButtonProps, 'position'>

/**
 * "Report a problem" menu row. Shared by the default and verification help menus. Opening the
 * report modal is owned by the factory (the modal must outlive the menu's dismissal), so this row
 * just forwards the press.
 */
const ReportProblemListButton = ({
  onPress,
  position,
}: { onPress: () => void } & Pick<ListButtonProps, 'position'>) => {
  const { t } = useTranslation()

  return (
    <ListButton position={position} onPress={onPress}>
      {t('BCSC.HelpMenu.ReportProblem')}
    </ListButton>
  )
}

/**
 * "Give feedback" menu row. Opens the feedback form in the device browser rather than an in-app
 * WebView, so the row carries the external-link affordance. Passing non-string children opts out of
 * ListButton's automatic ThemedText wrapping and a11y label, hence both are supplied here.
 */
const GiveFeedbackListButton = ({ onClose, position }: MenuRowProps) => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()

  const handlePress = useCallback(() => {
    openLink(FEEDBACK_URL)
    onClose()
  }, [onClose])

  return (
    <ListButton
      position={position}
      onPress={handlePress}
      accessibilityLabel={a11yLabel(t('BCSC.HelpMenu.GiveFeedback'))}
      accessibilityHint={t('Global.A11y.OpensInBrowser')}
    >
      <ThemedText style={{ flex: 1, color: ColorPalette.brand.headerText }}>
        {t('BCSC.HelpMenu.GiveFeedback')}
      </ThemedText>
      <Icon name="open-in-new" size={20} color={ColorPalette.brand.headerText} />
    </ListButton>
  )
}

/**
 * "Back to home" menu row (verify flow only). Leaves the in-progress verification and returns to
 * the app home screen, keeping progress so the user can resume later (see {@link useLeaveVerification}).
 */
const BackToHomeListButton = ({ onClose, position }: MenuRowProps) => {
  const { t } = useTranslation()
  const leaveVerification = useLeaveVerification()

  return (
    <ListButton position={position} onPress={() => leaveVerification(onClose)}>
      {t('BCSC.HelpMenu.BackToHome')}
    </ListButton>
  )
}

/**
 * "Restart verification process" menu row (verify flow only). Kept as its own component so the
 * verification-reset hook only runs in menus that render it.
 */
const RestartVerificationListButton = ({ onClose, position }: MenuRowProps) => {
  const { t } = useTranslation()
  const promptRestartVerification = useRestartVerification()

  return (
    <ListButton position={position} onPress={() => promptRestartVerification(onClose)}>
      {t('BCSC.HelpMenu.RestartVerification')}
    </ListButton>
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

export type FloatingHelpMenuButtonOptions = {
  /** The current stack's WebView screen that the "Learn More" option should open. */
  webViewScreen: keyof WebViewParamList
  /** Help centre article opened by "Learn More". Defaults to the help centre home page. */
  learnMoreUrl?: HelpCentreUrl
}

/**
 * Factory for the default stack help menu button: "Learn more" (opens the given help centre
 * article in the stack's WebView screen), "Give feedback", and "Report a problem".
 *
 * The verification flow uses {@link createVerifyHelpMenuButton} instead, which offers a different
 * set of actions and a different trigger icon.
 *
 * @param options - The stack's WebView screen and the optional help centre article for "Learn More".
 * @returns A React component that renders the help menu button.
 */
export const createFloatingHelpMenuButton = ({
  webViewScreen,
  learnMoreUrl = HelpCentreUrl.HOME,
}: FloatingHelpMenuButtonOptions) => {
  const FloatingHelpMenuHeaderRight = () => {
    const { t } = useTranslation()
    const navigation = useNavigation<StackNavigationProp<WebViewParamList>>()
    const floatingHelpMenuRef = useRef<FloatingHelpMenuRef>(null)
    const closeMenu = useCallback(() => floatingHelpMenuRef.current?.close(), [])
    const reportProblem = useReportProblem(floatingHelpMenuRef)

    const handleLearnMore = useCallback(() => {
      navigation.navigate(webViewScreen, { url: learnMoreUrl, title: t('HelpCentre.Title') })
      floatingHelpMenuRef.current?.close()
    }, [navigation, t])

    return (
      <>
        <FloatingHelpMenuButton ref={floatingHelpMenuRef} icon={DEFAULT_HELP_ICON}>
          <ListButton onPress={handleLearnMore}>{t('BCSC.HelpMenu.LearnMore')}</ListButton>
          <GiveFeedbackListButton onClose={closeMenu} />
          <ReportProblemListButton onPress={reportProblem.open} />
        </FloatingHelpMenuButton>
        <ReportProblemModal visible={reportProblem.visible} onClose={reportProblem.hide} />
      </>
    )
  }

  return FloatingHelpMenuHeaderRight
}

export type VerifyHelpMenuButtonOptions = {
  /**
   * Show the "Restart verification process" row. Off for the initial verify prompt (verification
   * hasn't started yet), on for the rest of the flow.
   */
  showRestartVerification?: boolean
}

/**
 * Factory for the verification flow's help menu button. Uses the vertical-ellipsis trigger icon and
 * offers "Report a problem", "Back to home" (leave the flow, keeping progress), and — once
 * verification is underway — "Restart verification process".
 *
 * @param options - Whether to show the "Restart verification process" row.
 * @returns A React component that renders the verification help menu button.
 */
export const createVerifyHelpMenuButton = ({ showRestartVerification = false }: VerifyHelpMenuButtonOptions = {}) => {
  const VerifyHelpMenuHeaderRight = () => {
    const floatingHelpMenuRef = useRef<FloatingHelpMenuRef>(null)
    const closeMenu = useCallback(() => floatingHelpMenuRef.current?.close(), [])
    const reportProblem = useReportProblem(floatingHelpMenuRef)

    return (
      <>
        <FloatingHelpMenuButton ref={floatingHelpMenuRef} icon={VERIFY_HELP_ICON}>
          <ReportProblemListButton onPress={reportProblem.open} />
          <BackToHomeListButton onClose={closeMenu} />
          {showRestartVerification && <RestartVerificationListButton onClose={closeMenu} />}
        </FloatingHelpMenuButton>
        <ReportProblemModal visible={reportProblem.visible} onClose={reportProblem.hide} />
      </>
    )
  }

  return VerifyHelpMenuHeaderRight
}
