import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { HelpCentreContent } from './HelpCentreContent'

type MainHelpCentreScreenProps = {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainHelpCentre>
}

/**
 * Help Centre screen for the Main stack.
 * Wraps HelpCentreContent with proper navigation typing.
 */
export const MainHelpCentreScreen: React.FC<MainHelpCentreScreenProps> = () => {
  return <HelpCentreContent />
}
