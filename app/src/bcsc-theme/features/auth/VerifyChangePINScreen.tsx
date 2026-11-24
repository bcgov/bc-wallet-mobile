import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ChangePINContent } from './ChangePINContent'

interface VerifyChangePINScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyChangePIN>
  route: RouteProp<BCSCVerifyStackParams, BCSCScreens.VerifyChangePIN>
}

export const VerifyChangePINScreen: React.FC<VerifyChangePINScreenProps> = ({
  navigation,
  route,
}: VerifyChangePINScreenProps) => {
  const isChangingExistingPIN = route.params?.isChangingExistingPIN ?? false

  const handleChangePINSuccess = useCallback(() => {
    navigation.goBack()
  }, [navigation])

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
