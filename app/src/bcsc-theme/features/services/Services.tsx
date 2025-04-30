import React from 'react'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { ThemedText, useTheme } from '@bifold/core'
import { StyleSheet } from 'react-native'

import ServiceButton from './components/ServiceButton'

interface ServiceData {
  id: string
  title: string
  description: string
  onPress: () => void
}

// to be replaced with API response or translation entries, whichever ends up being the case
const mockHeaderText = 'Browse websites you can log in to with this app'
const mockServices: ServiceData[] = [
  {
    id: '1',
    title: 'Evacuee Registration and Assistance',
    description: 'Register for support in the event of an emergency or evacuation.',
    onPress: () => null,
  },
  {
    id: '2',
    title: 'Health Gateway',
    description:
      'View your B.C. health records in one place, including lab test results, medications, health visits, immunizations and more.',
    onPress: () => null,
  },
  {
    id: '3',
    title: 'Canada Revenue Agency - CRA Account',
    description: 'View and manage your personal and business tax and benefit information, and represent others online.',
    onPress: () => null,
  },
  {
    id: '4',
    title: 'My Service Canada Account',
    description: 'Access programs and benefits from Employment and Social Development Canada.',
    onPress: () => null,
  },
  {
    id: '5',
    title: 'StudentAid BC',
    description: 'Apply for a student loan or manage your loan.',
    onPress: () => null,
  },
]

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
