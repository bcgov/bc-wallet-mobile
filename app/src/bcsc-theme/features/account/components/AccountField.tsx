import { useTheme, ThemedText } from '@bifold/core'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'

export interface AccountFieldProps {
  label: string
  value: string
  style?: ViewStyle
}

const AccountField: React.FC<AccountFieldProps> = ({ label, value, style }) => {
  const { Spacing, ColorPallet } = useTheme()

  const styles = StyleSheet.create({
    label: {
      color: ColorPallet.brand.secondary,
      marginBottom: Spacing.xs,
    },
    value: {
      color: ColorPallet.brand.secondary,
    },
  })

  return (
    <View style={style}>
      <ThemedText style={styles.label} variant={'bold'}>{label}</ThemedText>
      <ThemedText style={styles.value}>{value}</ThemedText>
    </View>
  )
}

export default AccountField