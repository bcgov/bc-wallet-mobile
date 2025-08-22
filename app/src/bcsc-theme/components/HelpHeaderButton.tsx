import { HelpCentreUrl } from '@/constants'
import { ButtonLocation, IconButton, testIdWithKey, TOKENS, useServices } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { BCSCScreens } from '../types/navigators'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { StackNavigationProp } from '@react-navigation/stack'

type HelpHeaderButtonUrlProps = {
  /**
   * The URL of the Help Centre page to navigate to, opens in a webview.
   *
   * @type {HelpCentreUrl}
   */
  helpCentreUrl: HelpCentreUrl
  helpAction?: never
}

type HelpHeaderButtonActionProps = {
  /**
   * Function to call when the help button is pressed.
   *
   * @returns {*} {void}
   */
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
const createHelpHeaderButton = (helpHeaderProps: HelpHeaderButtonProps) => {
  // Declared so that it has a display name for debugging purposes
  const HeaderRight = () => {
    const { t } = useTranslation()
    const [logger] = useServices([TOKENS.UTIL_LOGGER])
    const navigation = useNavigation<StackNavigationProp<any, BCSCScreens.WebView>>()

    /**
     * Handles navigation to the Help Centre webview.
     *
     * @param {string} helpCentreUrl - The URL of the Help Centre page to navigate to.
     * @returns {*} {Promise<void>}
     */
    const handleHelpCentreNavigation = useCallback(
      async (helpCentreUrl: HelpCentreUrl) => {
        try {
          navigation.navigate(BCSCScreens.WebView, {
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
          // If helpCentreUrl is provided, navigate to the Help Centre webview
          if (helpHeaderProps.helpCentreUrl) {
            handleHelpCentreNavigation(helpHeaderProps.helpCentreUrl)
            return
          }

          // Otherwise, execute the custom help action
          helpHeaderProps.helpAction()
        }}
      />
    )
  }
  return HeaderRight
}

export default createHelpHeaderButton
