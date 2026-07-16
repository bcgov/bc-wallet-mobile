import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback } from 'react'
import { ChangeSecurityContent } from './ChangeSecurityContent'

export interface VerifyChangeSecurityScreenProps {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyAppSecurity>
}

/**
 * App Security screen for the Verify stack.
 * Wraps ChangeSecurityContent with Verify stack-specific navigation callbacks.
 */
export const VerifyChangeSecurityScreen = ({ navigation }: VerifyChangeSecurityScreenProps) => {
  const handleDeviceAuthSuccess = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handlePINPress = useCallback(() => {
    navigation.navigate(BCSCScreens.VerifyChangePIN)
  }, [navigation])

  return <ChangeSecurityContent onDeviceAuthSuccess={handleDeviceAuthSuccess} onPINPress={handlePINPress} />
}
