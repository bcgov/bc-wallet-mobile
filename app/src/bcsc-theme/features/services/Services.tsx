import React, { useEffect, useMemo, useState } from 'react'
import { testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceButton from './components/ServiceButton'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { ClientMetadata } from '@/bcsc-theme/api/hooks/useMetadataApi'
import { BCState } from '@/store'
import { getCardProcessForCardType } from '@/bcsc-theme/utils/card-utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useNavigation } from '@react-navigation/native'
import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

const SEARCH_DEBOUNCE_DELAY_MS = 300

type ServicesNavigationProp = StackNavigationProp<BCSCRootStackParams, BCSCScreens.ServiceLoginScreen>

/**
 * Services screen component that displays a list of services accessible with the user's BCSC card.
 *
 * @return {*} {JSX.Element} The Services screen component.
 */
const Services: React.FC = () => {
  const { metadata } = useApi()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const navigation = useNavigation<ServicesNavigationProp>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY_MS)

  const styles = StyleSheet.create({
    headerText: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    searchContainer: {
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    searchInput: {
      height: 60,
      borderRadius: 24,
      color: TextTheme.normal.color,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.lg,
      fontSize: TextTheme.headerTitle.fontSize,
      padding: Spacing.md,
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

  // Services that are compatible with the user's card type
  const supportedServices = useMemo(() => {
    if (!services) {
      return []
    }

    // Filter services based on the user's card type (ie: card process)
    // TODO (MD): filter services on `bc_address` boolean (check users address)
    return (
      services
        .filter((service) =>
          service.allowed_identification_processes.includes(getCardProcessForCardType(store.bcsc.cardType))
        )
        // Sort services alphabetically by client_name
        .sort((a, b) => a.client_name.localeCompare(b.client_name))
    )
  }, [services, store.bcsc.cardType])

  // Filter services based on the search text
  const filteredServices = useMemo(() => {
    // Return all supported services when there's no search text
    if (debouncedSearch.trim() === '') {
      return supportedServices
    }

    // Filter supported services based on the search text (case insensitive)
    const query = debouncedSearch.toLowerCase()
    return supportedServices.filter((service) => service.client_name.toLowerCase().includes(query))
  }, [supportedServices, debouncedSearch])

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

  // TODO (MD): implement a loading UI

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}
    >
      <ScrollView stickyHeaderIndices={[1]}>
        <ThemedText variant={'headingThree'} style={styles.headerText}>
          {t('Services.CatalogueTitle')}
        </ThemedText>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder={t('Services.CatalogueSearch')}
            placeholderTextColor={ColorPalette.brand.tertiary}
            value={search}
            onChange={(event) => {
              setSearch(event.nativeEvent.text)
            }}
            accessibilityLabel={t('Services.CatalogueSearch')}
            testID={testIdWithKey('search')}
            style={styles.searchInput}
          />
        </View>
        {filteredServices.map((service) => (
          <ServiceButton
            key={service.client_ref_id}
            title={service.client_name}
            description={service.client_description}
            onPress={() => {
              navigation.navigate(BCSCScreens.ServiceLoginScreen, {
                service,
              })
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Services
