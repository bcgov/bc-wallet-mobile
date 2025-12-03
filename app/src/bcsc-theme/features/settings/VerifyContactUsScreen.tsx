import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { ScreenWrapper } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { ContactUsContent } from './ContactUsContent'

type VerifyContactUsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyContactUs>
}

/**
 * Contact Us screen for the Verify stack.
 * Wraps ContactUsContent with proper navigation typing.
 */
export const VerifyContactUsScreen: React.FC<VerifyContactUsScreenProps> = () => {
  return (
    <ScreenWrapper>
      <ContactUsContent />
    </ScreenWrapper>
  )
}
