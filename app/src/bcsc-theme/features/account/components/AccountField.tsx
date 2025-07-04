import { useTheme, ThemedText } from '@bifold/core'
import React from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'

export interface AccountFieldProps {
  label: string
  value: string
  style?: ViewStyle
}

const AccountField: React.FC<AccountFieldProps> = ({ label, value, style }) => {
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    label: {
      marginBottom: Spacing.xs,
    },
  })

  return (
    <View style={[{ marginTop: Spacing.lg }, style]}>
      <ThemedText style={styles.label} variant={'bold'}>
        {label}
      </ThemedText>
      <ThemedText>{value}</ThemedText>
    </View>
  )
}

export default AccountField
