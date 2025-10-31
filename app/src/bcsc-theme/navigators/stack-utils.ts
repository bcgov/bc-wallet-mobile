import { createHeaderWithoutBanner } from '../components/HeaderWithBanner'
import { StackNavigationOptions } from '@react-navigation/stack'

/**
 * Returns default screen options for modal presentations.
 *
 * @param {string} title - The translation function for localization.
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
  }
}
