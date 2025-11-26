import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { ContactUsContent } from './ContactUsContent'

type MainContactUsScreenProps = {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainContactUs>
}

/**
 * Contact Us screen for the Main stack.
 * Wraps ContactUsContent with proper navigation typing.
 */
export const MainContactUsScreen: React.FC<MainContactUsScreenProps> = () => {
  return (
    <ScreenWrapper>
      <ContactUsContent />
    </ScreenWrapper>
  )
}
