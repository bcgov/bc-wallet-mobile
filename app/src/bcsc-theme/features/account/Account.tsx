import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme, ThemedText } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import AccountPhoto from './components/AccountPhoto'
import AccountField, { AccountFieldProps } from './components/AccountField'

const mockData: AccountFieldProps[] = [
  {
    label: 'App expiry date',
    value: 'SEPTEMBER 19, 2028',
  },
  {
    label: 'Account type',
    value: 'BC Services Card with photo',
  },
  {
    label: 'Address',
    value: '117-6971 WEST COAST RD\nSOOKE, BC  V9Z 0V1',
  },
  {
    label: 'Date of birth',
    value: 'MARCH 15, 1993',
  },
  {
    label: 'Email address',
    value: 'bryce.j.mcmath@gmail.com',
  },
]

const Account: React.FC = () => {
  const { Spacing, ColorPallet } = useTheme()

  const styles = StyleSheet.create({
    container: {
      padding: Spacing.md,
      flex: 1,
    },
    photoAndNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    name: {
      marginLeft: Spacing.sm,
      color: ColorPallet.brand.secondary,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    warning: {
      marginTop: Spacing.sm,
      color: ColorPallet.brand.secondary,
    },
  })

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <View style={styles.photoAndNameContainer}>
          <AccountPhoto />
          <ThemedText variant={'headingTwo'} style={styles.name}>
            MCMATH, BRYCE JAMUS
          </ThemedText>
        </View>
        <ThemedText style={styles.warning}>
          {`This cannot be used as photo ID, a driver's licence, or a health card.`}
        </ThemedText>
        {mockData.map((field, index) => (
          <AccountField
            key={`field-${index}`}
            label={field.label}
            value={field.value}
            style={{ marginTop: Spacing.lg }}
          />
        ))}
      </View>
    </TabScreenWrapper>
  )
}

export default Account
