import { StackNavigationOptions } from '@react-navigation/stack'
import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { BCSCScreens, BCSCStacks } from '../types/navigators'

/**
 * Returns default screen options for modal presentations.
 *
 * @param {string} title - The title of the modal screen.
 * @returns {*} {StackNavigationOptions} The default modal screen options.
 */
export function getDefaultModalOptions(title?: string): StackNavigationOptions {
  return {
    presentation: 'modal',
    headerShown: true,
    headerLeft: () => null,
    title: title,
    headerShadowVisible: false,
    header: createHeaderWithoutBanner,
    gestureEnabled: true,
  }
}

/**
 * Gets the base screen name by removing the stack prefix from the screen name.
 *
 * @param screen - The screen name to get the base name from.
 * @returns The base screen name without the stack prefix.
 */
export const getBaseScreenName = (screen: BCSCScreens | string): string => {
  for (const stack of Object.values(BCSCStacks)) {
    if (screen.startsWith(stack)) {
      return screen.slice(stack.length).trim()
    }
  }

  return screen
}
