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
      borderRadius: Spacing.sm,
      gap: Spacing.md,
    },
    // Text beside a fixed-size icon has to be allowed to shrink, or it is laid out at the full row
    // width and overflows the border instead of wrapping once the OS font size makes it taller.
    text: {
      flexShrink: 1,
    },
  })

  return (
    <View style={styles.container}>
      <Icon name={'information'} size={ICON_SIZE} color={ColorPalette.grayscale.mediumGrey} accessible={false} />
      <ThemedText style={styles.text}>{t('Notification.EmptyNotification.Title')}</ThemedText>
    </View>
  )
}
