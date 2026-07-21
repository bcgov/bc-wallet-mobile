import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface WelcomeHeaderProps {
  /**
   * Pre-formatted account holder name shown as the greeting title (ie: "Beaumont, Laurie").
   */
  name: string
}

/**
 * Home screen greeting: a small "Welcome" label above the account holder's name.
 */
const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ name }) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      gap: Spacing.xs,
    },
  })

  return (
    <View style={styles.container}>
      <ThemedText variant={'headingFour'}>{t('BCSC.Home.Welcome')}</ThemedText>
      <ThemedText variant={'headingThree'}>{name}</ThemedText>
    </View>
  )
}

export default WelcomeHeader
