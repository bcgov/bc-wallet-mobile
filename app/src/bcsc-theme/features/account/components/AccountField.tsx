import { PressableOpacity } from '@/components/PressableOpacity'
import { hitSlop } from '@/constants'
import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, ViewStyle } from 'react-native'

export interface AccountFieldProps {
  label: string
  value: string
  style?: ViewStyle
  onEdit?: () => void
  editAccessibilityLabel?: string
  testID?: string
}

const AccountField: React.FC<AccountFieldProps> = ({ label, value, style, onEdit, editAccessibilityLabel, testID }) => {
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    label: {
      marginBottom: Spacing.xs,
      color: TextTheme.headingFour.color,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.md,
    },
    value: {
      flex: 1,
    },
    editLink: {
      color: ColorPalette.brand.link,
      fontWeight: 'bold',
    },
  })

  return (
    <View style={[{ marginTop: Spacing.lg }, style]} testID={testID}>
      <ThemedText style={styles.label} variant={'bold'}>
        {label}
      </ThemedText>
      <View style={styles.valueRow}>
        <ThemedText style={styles.value}>{value}</ThemedText>
        {onEdit ? (
          <PressableOpacity
            onPress={onEdit}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={editAccessibilityLabel ?? t('BCSC.AccountDetails.Edit')}
            testID={testID ? `${testID}-edit` : undefined}
          >
            <ThemedText style={styles.editLink}>{t('BCSC.AccountDetails.Edit')}</ThemedText>
          </PressableOpacity>
        ) : null}
      </View>
    </View>
  )
}

export default AccountField
