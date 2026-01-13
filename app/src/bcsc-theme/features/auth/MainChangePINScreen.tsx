import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ChangePINContent } from './ChangePINContent'

interface MainChangePINScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>
}

/**
 * Change PIN screen for the Main stack.
 * Wraps ChangePINContent with Main stack-specific navigation callbacks.
 */
export const MainChangePINScreen: React.FC<MainChangePINScreenProps> = ({
  navigation,
  route,
}: MainChangePINScreenProps) => {
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
