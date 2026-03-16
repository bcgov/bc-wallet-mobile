import { NavigationState } from '@react-navigation/native'
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
 * @example getBaseScreenName('BCSCAuthStack EnterPIN') // returns 'EnterPIN'
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

/**
 * Gets the current screen name from the navigation state, accounting for nested navigators.
 *
 * @param state - The navigation state object.
 * @returns The name of the current screen.
 */
export const getCurrentStateScreenName = (state: NavigationState): string => {
  const currentRoute = state.routes[state.index]

  if (!currentRoute.state || currentRoute.state.index === undefined || !currentRoute.state.routes) {
    // If there is no nested state (ie: TabStack), return the current route name
    return currentRoute.name
  }

  return getCurrentStateScreenName(currentRoute.state as NavigationState)
}
