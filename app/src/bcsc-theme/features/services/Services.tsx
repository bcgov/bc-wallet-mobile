import React, { useState } from 'react'
import { testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { Keyboard, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceButton from './components/ServiceButton'
import { BCState } from '@/store'
import { getCardProcessForCardType } from '@/bcsc-theme/utils/card-utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useNavigation } from '@react-navigation/native'
import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useFilterServiceClients } from './hooks/useFilterServiceClients'

const SEARCH_DEBOUNCE_DELAY_MS = 300

type ServicesNavigationProp = StackNavigationProp<BCSCRootStackParams, BCSCScreens.ServiceLoginScreen>

/**
 * Services screen component that displays a list of services accessible with the user's BCSC card.
 *
 * @return {*} {JSX.Element} The Services screen component.
 */
const Services: React.FC = () => {
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const navigation = useNavigation<ServicesNavigationProp>()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY_MS)

  const serviceClients = useFilterServiceClients({
    cardProcessFilter: getCardProcessForCardType(store.bcsc.cardType),
    partialNameFilter: debouncedSearch,
  })

  const styles = StyleSheet.create({
    headerText: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.lg,
    },
    searchInputContainer: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    searchInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderRadius: 8,
      height: Spacing.xl * 2,
      paddingHorizontal: Spacing.md,
    },
    searchText: {
      flex: 1,
      fontSize: TextTheme.headerTitle.fontSize,
      color: TextTheme.normal.color,
      marginLeft: Spacing.sm,
    },
  })

  // TODO (MD): implement a loading UI
  // TODO (MD): implement an empty state UI

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}
    >
      {/* Dismiss keyboard when tapping outside of TextInput */}
      <ScrollView stickyHeaderIndices={[1]} keyboardShouldPersistTaps="handled">
        <ThemedText variant={'headingTwo'} style={styles.headerText}>
          {t('Services.CatalogueTitle')}
        </ThemedText>
        <TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <View style={styles.searchInput}>
              <Icon name="search" size={30} color={ColorPalette.brand.tertiary} />
              <TextInput
                placeholder={t('Services.CatalogueSearch')}
                placeholderTextColor={ColorPalette.brand.tertiary}
                value={search}
                clearButtonMode="while-editing"
                onChangeText={(newText) => {
                  // Dismiss keyboard when clearing search text
                  if (search.length > 0 && newText === '') {
                    Keyboard.dismiss()
                  }

                  setSearch(newText)
                }}
                accessibilityLabel={t('Services.CatalogueSearch')}
                testID={testIdWithKey('search')}
                style={styles.searchText}
              />
            </View>
          </View>
        </TouchableOpacity>
        {serviceClients.map((service) => (
          <ServiceButton
            key={service.client_ref_id}
            title={service.client_name}
            description={service.client_description}
            onPress={() => {
              navigation.navigate(BCSCScreens.ServiceLoginScreen, {
                serviceClient: service,
              })
            }}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

export default Services
