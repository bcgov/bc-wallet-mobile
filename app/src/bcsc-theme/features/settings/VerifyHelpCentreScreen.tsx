import { BCSCVerifyStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { HelpCentreContent } from './HelpCentreContent'

type VerifyHelpCentreScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyHelpCentre>
}

/**
 * Help Centre screen for the Verify stack.
 * Wraps HelpCentreContent with proper navigation typing.
 */
export const VerifyHelpCentreScreen: React.FC<VerifyHelpCentreScreenProps> = () => {
  return <HelpCentreContent />
}
