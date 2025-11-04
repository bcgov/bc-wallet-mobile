import { HelpCentreUrl } from '@/constants'
import { ButtonLocation, IconButton, testIdWithKey, TOKENS, useServices } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BCSCMainStackParams, BCSCScreens, BCSCVerifyStackParams } from '../types/navigators'

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
 * Creates a Help Header Button component that can either navigate to a Help Centre URL or execute a custom action.
 *
 * Note: This is a curried function to avoid re-rendering in navigation stacks.
 *
 * @param {HelpHeaderButtonProps} helpHeaderProps - The properties for the Help Header Button.
 * @returns {*} {React.FC} A React functional component that renders the Help Header Button.
 */
export const createMainHelpHeaderButton = (helpHeaderProps: HelpHeaderButtonProps) => {
  const MainHeaderRight = () => {
    const { t } = useTranslation()
    const [logger] = useServices([TOKENS.UTIL_LOGGER])
    const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

    const handleHelpCentreNavigation = useCallback(
      async (helpCentreUrl: HelpCentreUrl) => {
        try {
          navigation.navigate(BCSCScreens.MainWebView, {
            url: helpCentreUrl,
            title: t('HelpCentre.Title'),
          })
        } catch (error) {
          logger.error(`Error navigating to Help Center webview: ${error}`)
        }
      },
      [navigation, logger, t]
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
  return MainHeaderRight
}

/**
 * Creates a Help Header Button for the Verify Stack that navigates to VerifyWebView or executes a custom action.
 */
export const createVerifyHelpHeaderButton = (helpHeaderProps: HelpHeaderButtonProps) => {
  const VerifyHeaderRight = () => {
    const { t } = useTranslation()
    const [logger] = useServices([TOKENS.UTIL_LOGGER])
    const navigation = useNavigation<StackNavigationProp<BCSCVerifyStackParams>>()

    const handleHelpCentreNavigation = useCallback(
      async (helpCentreUrl: HelpCentreUrl) => {
        try {
          navigation.navigate(BCSCScreens.VerifyWebView, {
            url: helpCentreUrl,
            title: t('HelpCentre.Title'),
          })
        } catch (error) {
          logger.error(`Error navigating to Help Center webview: ${error}`)
        }
      },
      [navigation, logger, t]
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
  return VerifyHeaderRight
}
