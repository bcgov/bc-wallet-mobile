import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

const ICON_SIZE = 24

/**
 * A component that displays a notification when there are no notifications to show.
 *
 * @returns {React.ReactElement} The EmptyNotification component
 */
export const EmptyNotification = () => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      padding: Spacing.md,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: ColorPalette.grayscale.lightGrey,
      borderRadius: 8,
      gap: Spacing.md,
    },
  })

  return (
    <View style={styles.container}>
      <Icon name={'information'} size={ICON_SIZE} color={ColorPalette.grayscale.mediumGrey} accessible={false} />
      <ThemedText>{t('Notification.EmptyNotification.Title')}</ThemedText>
    </View>
  )
}
