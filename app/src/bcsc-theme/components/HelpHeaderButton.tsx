import { HelpCentreUrl } from '@/constants'
import { ButtonLocation, IconButton, testIdWithKey, TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCMainStackParams, BCSCOnboardingStackParams, BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'

type HelpHeaderButtonUrlProps = {
  helpCentreUrl: HelpCentreUrl
  helpAction?: never
}

type HelpHeaderButtonActionProps = {
  helpAction: () => void
  helpCentreUrl?: never
}

type HelpHeaderButtonProps = HelpHeaderButtonUrlProps | HelpHeaderButtonActionProps

/**
 * Shared Help Header Button component that accepts a navigation callback.
 */
const HelpHeaderButton: React.FC<{
  helpHeaderProps: HelpHeaderButtonProps
  navigateToWebView: (url: string, title: string) => void
}> = ({ helpHeaderProps, navigateToWebView }) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const handleHelpCentreNavigation = useCallback(
    async (helpCentreUrl: HelpCentreUrl) => {
      try {
        navigateToWebView(helpCentreUrl, t('HelpCentre.Title'))
      } catch (error) {
        logger.error(`Error navigating to Help Center webview: ${error}`)
      }
    },
    [navigateToWebView, logger, t]
  )

  return (
    <IconButton
      buttonLocation={ButtonLocation.Right}
      icon={'help-circle'}
      accessibilityLabel={t('PersonCredential.HelpLink')}
      testID={testIdWithKey('Help')}
      onPress={() => {
        if (helpHeaderProps.helpCentreUrl) {
          handleHelpCentreNavigation(helpHeaderProps.helpCentreUrl)
          return
        }
        helpHeaderProps.helpAction()
      }}
    />
  )
}

/**
 * Creates a Help Header Button for the Main Stack that navigates to MainWebView or executes a custom action.
 */
export const createMainHelpHeaderButton = (helpHeaderProps: HelpHeaderButtonProps) => {
  const MainHeaderRight = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

    const navigateToWebView = useCallback(
      (url: string, title: string) => {
        navigation.navigate(BCSCScreens.MainWebView, { url, title })
      },
      [navigation]
    )

    return <HelpHeaderButton helpHeaderProps={helpHeaderProps} navigateToWebView={navigateToWebView} />
  }
  return MainHeaderRight
}

/**
 * Creates a Help Header Button for the Verify Stack that navigates to VerifyWebView or executes a custom action.
 */
export const createVerifyHelpHeaderButton = (helpHeaderProps: HelpHeaderButtonProps) => {
  const VerifyHeaderRight = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

    const navigateToWebView = useCallback(
      (url: string, title: string) => {
        navigation.navigate(BCSCScreens.VerifyWebView, { url, title })
      },
      [navigation]
    )

    return <HelpHeaderButton helpHeaderProps={helpHeaderProps} navigateToWebView={navigateToWebView} />
  }
  return VerifyHeaderRight
}

/**
 * Creates a Help Header Button for the Onboarding Stack that navigates to OnboardingWebView or executes a custom action.
 */
export const createOnboardingHelpHeaderButton = (helpHeaderProps: HelpHeaderButtonProps) => {
  const OnboardingHeaderRight = () => {
    const navigation = useNavigation<StackNavigationProp<BCSCOnboardingStackParams>>()

    const navigateToWebView = useCallback(
      (url: string, title: string) => {
        navigation.navigate(BCSCScreens.OnboardingWebView, { url, title })
      },
      [navigation]
    )

    return <HelpHeaderButton helpHeaderProps={helpHeaderProps} navigateToWebView={navigateToWebView} />
  }
  return OnboardingHeaderRight
}
