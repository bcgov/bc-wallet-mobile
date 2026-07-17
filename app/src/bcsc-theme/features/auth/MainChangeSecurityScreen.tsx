import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ChangeSecurityContent } from './ChangeSecurityContent'

export interface MainChangeSecurityScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainAppSecurity>
}

/**
 * App Security screen for the Main stack.
 * Wraps ChangeSecurityContent with Main stack-specific navigation callbacks.
 */
export const MainChangeSecurityScreen = ({ navigation }: MainChangeSecurityScreenProps) => {
  const handleDeviceAuthSuccess = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.MainChangePIN)
  }, [navigation])

  return <ChangeSecurityContent onDeviceAuthSuccess={handleDeviceAuthSuccess} onPINPress={handlePINPress} />
}
