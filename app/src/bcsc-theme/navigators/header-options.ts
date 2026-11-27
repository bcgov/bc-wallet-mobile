import { DEFAULT_HEADER_TITLE_CONTAINER_STYLE } from '@/constants'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { StackNavigationOptions } from '@react-navigation/stack'
import { createFloatingHelpMenuButton } from '../components/FloatingHelpMenuHeaderButton'
import { createHeaderBackButton } from '../components/HeaderBackButton'
import { createStackHeader } from '../components/NavigationHeaders'
import { BCSCScreens } from '../types/navigators'

/**
 * Returns the header options MainStack gives its screens: BCSC's header, back button and help menu.
 * Bifold screens that BCSC shows inside Bifold's own nested stacks get the same options through
 * `TOKENS.OBJECT_SCREEN_CONFIG`, so their header matches.
 *
 * Kept out of `stack-utils`, which logging and navigation-trail code import: the help menu button
 * pulls in the store.
 *
 * @returns {*} {StackNavigationOptions} The header options.
 */
export function getMainStackHeaderOptions(): StackNavigationOptions {
  return {
    headerBackTestID: testIdWithKey(TestIds.common.back),
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    headerTitleContainerStyle: DEFAULT_HEADER_TITLE_CONTAINER_STYLE,
    headerLeft: createHeaderBackButton,
    header: createStackHeader,
    headerRight: createFloatingHelpMenuButton({ webViewScreen: BCSCScreens.MainWebView }),
  }
}
