import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface SavedServicesProps {
  services?: string[]
}

// to be replaced with API response or translation entries, whichever ends up being the case
const mockTitle = 'YOUR SAVED SERVICES'
const mockNoServicesMessage = 'No saved services'

const SavedServices: React.FC<SavedServicesProps> = ({ services = [] }) => {
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.lg,
      marginHorizontal: Spacing.md,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    bookmarkIcon: {
      marginRight: Spacing.md,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Icon name="bookmark" size={24} color={ColorPallet.brand.tertiary} style={styles.bookmarkIcon} />
        <ThemedText variant={'bold'} style={{ color: ColorPallet.brand.tertiary }}>
          {mockTitle}
        </ThemedText>
      </View>

      {services.length === 0 ? (
        <ThemedText variant={'headingFour'} style={{ color: ColorPallet.brand.tertiary, fontWeight: 'normal' }}>
          {mockNoServicesMessage}
        </ThemedText>
      ) : (
        services.map((service, index) => <ThemedText key={`${service}-${index}`}>{service}</ThemedText>)
      )}
    </View>
  )
}

export default SavedServices
