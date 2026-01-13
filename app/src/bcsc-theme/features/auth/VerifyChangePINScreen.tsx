import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ChangePINContent } from './ChangePINContent'

interface VerifyChangePINScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyChangePIN>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.VerifyChangePIN>
}

/**
 * Change PIN screen for the Verify stack.
 * Wraps ChangePINContent with Verify stack-specific navigation callbacks.
 */
export const VerifyChangePINScreen: React.FC<VerifyChangePINScreenProps> = ({
  navigation,
  route,
}: VerifyChangePINScreenProps) => {
  // Check if we're changing an existing PIN or switching from Device Auth
  const isChangingExistingPIN = route.params?.isChangingExistingPIN ?? false

  // Handler for when user successfully changed their PIN
  const handleChangePINSuccess = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Handler for when user successfully created a PIN (from Device Auth)
  const handleCreatePINSuccess = useCallback(() => {
    // Navigate back to settings, popping both ChangePIN and AppSecurity screens
    navigation.pop(2)
  }, [navigation])

  return (
    <ChangePINContent
      isChangingExistingPIN={isChangingExistingPIN}
      onChangePINSuccess={handleChangePINSuccess}
      onCreatePINSuccess={handleCreatePINSuccess}
    />
  )
}
