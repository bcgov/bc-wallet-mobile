import React, { useCallback, useEffect, useMemo, useState } from 'react'
import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { Alert, StyleSheet, TextInput } from 'react-native'
import ServiceButton from './components/ServiceButton'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import { BCState } from '@/store'
import { getCardProcessForCardType } from '@/bcsc-theme/utils/card-utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useNavigation } from '@react-navigation/native'

// to be replaced with API response or translation entries, whichever ends up being the case
const mockHeaderText = 'Browse websites you can log in to with this app'

/**
 * Services screen component that displays a list of services accessible with the user's BCSC card.
 *
 * @return {*} {JSX.Element} The Services screen component.
 */
const Services: React.FC = () => {
  const { Spacing } = useTheme()
  const { metadata } = useApi()
  const [store] = useStore<BCState>()
  const navigation = useNavigation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [searchText, setSearchText] = useState('')
  const debouncedSearchText = useDebounce(searchText, 300)

  const styles = StyleSheet.create({
    headerText: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
    },
  })

  const {
    data: services,
    load,
    isReady,
  } = useDataLoader<ClientMetadata[]>(() => metadata.getClientMetadata(), {
    onError: (error) => {
      logger.error('Error loading services', error as Error)
    },
  })

  useEffect(() => {
    load()
  }, [load])

  // Filter services based on the user's card type and search text
  const filteredServices = useMemo(() => {
    if (!services) {
      return []
    }

    // Filter services based on the user's card type (ie: card process)
    const supportedServices = services.filter((service) =>
      service.allowed_identification_processes.includes(getCardProcessForCardType(store.bcsc.cardType))
    )

    // Return all supported services when there's no search text
    if (debouncedSearchText.trim() === '') {
      return supportedServices
    }

    // Filter supported services based on the search text (case insensitive)
    const query = debouncedSearchText.toLowerCase()
    return supportedServices.filter((service) => service.client_name.toLowerCase().includes(query))
  }, [services, debouncedSearchText, store.bcsc.cardType])

  // Alert the user if services fail to load
  if (!services && isReady) {
    Alert.alert('Failed to load services', 'Please try again later.', [
      {
        text: 'OK',
        onPress: () => {
          navigation.goBack()
        },
      },
    ])
  }

  return (
    <TabScreenWrapper>
      <ThemedText variant={'headingThree'} style={styles.headerText}>
        {mockHeaderText}
      </ThemedText>
      <TextInput
        placeholder={'search'}
        value={searchText}
        onChange={(event) => {
          setSearchText(event.nativeEvent.text)
        }}
      />
      {filteredServices.map((service) => (
        <ServiceButton
          key={service.client_ref_id}
          title={service.client_name}
          description={service.client_description}
          onPress={() => {
            // TODO (MD): implement service press action
          }}
        />
      ))}
    </TabScreenWrapper>
  )
}

export default Services
