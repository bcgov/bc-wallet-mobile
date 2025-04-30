import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useTheme, ThemedText } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import AccountPhoto from './components/AccountPhoto'
import AccountField, { AccountFieldProps } from './components/AccountField'

const mockName = 'LEE-MARTINEZ, JAIME ANN'
const mockWarning = `This cannot be used as photo ID, a driver's licence, or a health card.`
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
    value: '123 LEDSHAM RD\nVICTORIA, BC V9B 1W8',
  },
  {
    label: 'Date of birth',
    value: 'JANUARY 28, 1995',
  },
  {
    label: 'Email address',
    value: 'jaime.lee-martinez@gmail.com',
  },
]

const Account: React.FC = () => {
  const { Spacing } = useTheme()

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
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    warning: {
      marginTop: Spacing.sm,
    },
  })

  return (
    <TabScreenWrapper>
      <View style={styles.container}>
        <View style={styles.photoAndNameContainer}>
          <AccountPhoto />
          <ThemedText variant={'headingTwo'} style={styles.name}>
            {mockName}
          </ThemedText>
        </View>
        <ThemedText style={styles.warning}>{mockWarning}</ThemedText>
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
