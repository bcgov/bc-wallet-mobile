import { ServiceData } from '@/bcsc-theme/fixtures/services'
import { ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface SavedServiceProps {
  title: string
  onPress: () => void
}

const SavedService: React.FC<SavedServiceProps> = ({ title, onPress }) => {
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    serviceContainer: {
      marginBottom: Spacing.sm,
      backgroundColor: ColorPallet.brand.secondaryBackground,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.md,
      justifyContent: 'center',
    },
  })

  return (
    <TouchableOpacity onPress={onPress} style={styles.serviceContainer}>
      <ThemedText>{title}</ThemedText>
    </TouchableOpacity>
  )
}
interface SavedServicesProps {
  services: ServiceData[]
}

// to be replaced with API response or translation entries, whichever ends up being the case
const mockTitle = 'YOUR SAVED SERVICES'
const mockNoServicesMessage = 'No saved services'

const SavedServices: React.FC<SavedServicesProps> = ({ services = [] }) => {
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.lg,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      marginHorizontal: Spacing.md,
    },
    bookmarkIcon: {
      marginRight: Spacing.sm,
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
        <ThemedText
          variant={'headingFour'}
          style={{ color: ColorPallet.brand.tertiary, fontWeight: 'normal', paddingHorizontal: Spacing.md }}
        >
          {mockNoServicesMessage}
        </ThemedText>
      ) : (
        services.map((service) => <SavedService key={service.id} title={service.title} onPress={service.onPress} />)
      )}
    </View>
  )
}

export default SavedServices
