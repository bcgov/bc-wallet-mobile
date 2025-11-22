import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { StyleSheet } from 'react-native'
import { ContactUsContent } from './ContactUsContent'

type VerifyContactUsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerifyContactUs>
}

/**
 * Contact Us screen for the Verify stack.
 * Wraps ContactUsContent with proper navigation typing.
 */
export const VerifyContactUsScreen: React.FC<VerifyContactUsScreenProps> = () => {
  const { ColorPalette, Spacing } = useTheme()
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
  })

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.container}
      edges={['bottom', 'left', 'right']}
      scrollViewProps={{ contentContainerStyle: { flexGrow: 1 } }}
    >
      <ContactUsContent />
    </ScreenWrapper>
  )
}
