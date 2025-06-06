import React from 'react'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet } from 'react-native'

import ServiceButton from './components/ServiceButton'
import { mockServices } from '@bcsc-theme/fixtures/services'

// to be replaced with API response or translation entries, whichever ends up being the case
const mockHeaderText = 'Browse websites you can log in to with this app'

const Services: React.FC = () => {
  const { Spacing } = useTheme()
  const styles = StyleSheet.create({
    headerText: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
    },
  })

  return (
    <TabScreenWrapper>
      <ThemedText variant={'headingThree'} style={styles.headerText}>
        {mockHeaderText}
      </ThemedText>
      {mockServices.map((service) => (
        <ServiceButton
          key={service.id}
          title={service.title}
          description={service.description}
          onPress={service.onPress}
        />
      ))}
    </TabScreenWrapper>
  )
}

export default Services
