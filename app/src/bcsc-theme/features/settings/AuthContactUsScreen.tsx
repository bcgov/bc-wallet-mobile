import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ScreenWrapper } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { ContactUsContent } from './ContactUsContent'

type AuthContactUsScreenProps = {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.AuthContactUs>
}

/**
 * Contact Us screen for the Auth stack.
 * Wraps ContactUsContent with proper navigation typing.
 */
export const AuthContactUsScreen: React.FC<AuthContactUsScreenProps> = () => {
  return (
    <ScreenWrapper>
      <ContactUsContent />
    </ScreenWrapper>
  )
}
