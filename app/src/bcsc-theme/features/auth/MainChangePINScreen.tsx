import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ChangePINContent } from './ChangePINContent'

interface MainChangePINScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.MainChangePIN>
}

export const MainChangePINScreen: React.FC<MainChangePINScreenProps> = ({
  navigation,
  route,
}: MainChangePINScreenProps) => {
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
