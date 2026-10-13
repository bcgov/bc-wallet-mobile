import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { HeaderBackButtonProps } from '@react-navigation/elements'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { BackHandler } from 'react-native'
import { useLeaveVerification } from '../hooks/useLeaveVerification'
import { useVerificationExitPolicy, VerificationExitPolicy } from '../hooks/useVerificationExitPolicy'
import { HeaderBackButton } from './HeaderBackButton'

type VerifyNavigation = StackNavigationProp<BCSCVerifyStackParams>

/**
 * Custom back behaviour for one verify screen. Receives the stack navigation, the leave-to-Home action
 * (see {@link useLeaveVerification}) and the current exit policy.
 */
export type VerifyBackPressHandler = (
  navigation: VerifyNavigation,
  leaveVerification: () => void,
  policy: VerificationExitPolicy
) => void

export type VerifyHeaderBackButtonOptions = {
  /**
   * Hide the arrow, always or per the exit policy. Android hardware back is still owned by this button
   * while hidden: `onPress` runs (a no-op makes it do nothing) and the event is consumed, so a screen
   * with no arrow never pops the stack or exits the app from the hardware key.
   */
  hidden?: boolean | ((policy: VerificationExitPolicy) => boolean)
}

/**
 * Creates the verify stack's header back button, the single owner of Android hardware back on the
 * screens that carry a header. Without `onPress` it pops when it can; at the beginning of the stack it
 * follows the exit policy: a first-time verifier returns to the "Verify your account" prompt (replace,
 * animated as a pop), everyone else leaves the flow for Home with progress kept.
 *
 * @param onPress Optional custom handler, called instead of the default behaviour.
 * @param options See {@link VerifyHeaderBackButtonOptions}.
 * @returns A `headerLeft` component.
 */
export const createVerifyHeaderBackButton = (
  onPress?: VerifyBackPressHandler,
  { hidden = false }: VerifyHeaderBackButtonOptions = {}
) => {
  const VerifyBackButton = (props: HeaderBackButtonProps) => {
    const navigation = useNavigation<VerifyNavigation>()
    const leaveVerification = useLeaveVerification()
    const policy = useVerificationExitPolicy()
    const isHidden = typeof hidden === 'function' ? hidden(policy) : hidden

    const handlePressBack = useCallback(() => {
      if (onPress) {
        return onPress(navigation, leaveVerification, policy)
      }

      if (navigation.canGoBack()) {
        return navigation.goBack()
      }

      if (policy.isFirstTimeVerifier) {
        // Nothing beneath (a resumed initial route): the prompt is the beginning of this user's flow
        navigation.replace(BCSCScreens.VerifyPrompt)
        return
      }

      leaveVerification()
    }, [leaveVerification, navigation, policy])

    useFocusEffect(
      useCallback(() => {
        // Parity for Android hardware back navigation
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
          handlePressBack()
          return true
        })

        return () => {
          subscription.remove()
        }
      }, [handlePressBack])
    )

    if (isHidden) {
      return null
    }

    return <HeaderBackButton {...props} onPress={handlePressBack} />
  }

  // The stack header calls `headerLeft` as a plain function during its own render, so the hooks above
  // need a component boundary of their own to be safe against a route changing its headerLeft
  const VerifyHeaderBackButton = (props: HeaderBackButtonProps) => <VerifyBackButton {...props} />

  return VerifyHeaderBackButton
}
