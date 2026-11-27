import i18n from 'i18next'
import { AlertButton } from 'react-native'

// Extends AlertButton to require text property
export type AlertAction = AlertButton & { text: string }

// Default OK action - evaluated at call time to get current translation
export const getDefaultOkAction = (): AlertAction => ({
  text: i18n.t('Global.Okay'),
  onPress: () => {},
})

/**
 * Wrap an async function with an alert callback.
 *
 * @param fn - The function to wrap
 * @param alert - The alert function to call if an error is thrown
 * @returns A new function that wraps the original function with an alert on error
 */
export const withAlert = <TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  alert: (error?: unknown) => void
) => {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args)
    } catch (error) {
      alert(error)
      throw error
    }
  }
}
