import TabScreenWrapper from '@/bcsc-theme/components/TabScreenWrapper'
import { useBCSCActivity } from '@/bcsc-theme/contexts/BCSCActivityContext'
import useDataLoader from '@/bcsc-theme/hooks/useDataLoader'
import { useTokenService } from '@/bcsc-theme/services/hooks/useTokenService'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { getCardProcessForCardType } from '@/bcsc-theme/utils/card-utils'
import { useDebounce } from '@/hooks/useDebounce'
import { BCState, Mode } from '@/store'
import { testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { a11yLabel } from '@utils/accessibility'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Keyboard, StyleSheet, TextInput, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import ServiceButton from './components/ServiceButton'
import { useFilterServiceClients } from './hooks/useFilterServiceClients'

const SEARCH_DEBOUNCE_DELAY_MS = 300

type ServicesNavigationProp = StackNavigationProp<BCSCMainStackParams, BCSCScreens.ServiceLogin>

/**
 * Services screen component that displays a list of services accessible
 * with the user's BCSC card.
 *
 * @return {*} {React.ReactElement} The Services screen component.
 */
const Services: React.FC = () => {
  const { reportActivity } = useBCSCActivity() ?? {}
  const token = useTokenService()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()
  const { ColorPalette, Spacing, TextTheme } = useTheme()
  const navigation = useNavigation<ServicesNavigationProp>()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY_MS)
  const searchInputRef = useRef<View>(null)
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { load: loadIdTokenMetadata, data: idTokenMetadata } = useDataLoader(
    // use the cache, card type doesn't change
    () => token.getCachedIdTokenMetadata({ refreshCache: false }),
    {
      onError: (error) => logger.error('Error loading card type', error as Error),
    }
  )
  const { serviceClients, isLoading } = useFilterServiceClients({
    cardProcessFilter: getCardProcessForCardType(idTokenMetadata?.bcsc_card_type ?? null),
    partialNameFilter: !search ? '' : debouncedSearch, // if search is empty, avoid debounce delay
    disabled: !store.bcscSecure.verified, // V4.1 only fetch service clients when user is verified
  })

  const isBCSCMode = store.mode === Mode.BCSC // isDarkMode? or isBCSCMode?

  useEffect(() => {
    if (store.bcscSecure.verified) {
      loadIdTokenMetadata()
    }
  }, [loadIdTokenMetadata, store.bcscSecure.verified])

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
      borderWidth: 1,
      borderColor: isBCSCMode ? '#1E5189' : '#D8D8D8',
    },
    searchText: {
      flex: 1,
      fontSize: TextTheme.headerTitle.fontSize,
      color: TextTheme.normal.color,
      marginLeft: Spacing.sm,
    },
    servicesContainer: {
      paddingHorizontal: Spacing.md,
      gap: 2,
    },
    bottomContainer: {
      margin: Spacing.md,
    },
    desciptionText: {
      lineHeight: 30,
    },
  })

  return (
    <TabScreenWrapper scrollViewProps={{ stickyHeaderIndices: [1], keyboardShouldPersistTaps: 'handled' }}>
      {/* Dismiss keyboard when tapping outside of TextInput */}
      <ThemedText variant={'headingTwo'} style={styles.headerText}>
        {t('BCSC.Services.CatalogueTitle')}
      </ThemedText>

      <View style={styles.searchInputContainer}>
        <View ref={searchInputRef} style={styles.searchInput}>
          <Icon name="search" size={24} color={ColorPalette.brand.tertiary} />
          <TextInput
            placeholder={t('BCSC.Services.CatalogueSearch')}
            placeholderTextColor={ColorPalette.brand.tertiary}
            value={search}
            // disable autocorrect to prevent completion when clearing search text
            autoCorrect={false}
            onChangeText={(newText) => {
              reportActivity?.()
              // Dismiss keyboard when clearing search text
              if (search.length > 0 && newText === '') {
                Keyboard.dismiss()
              }

              setSearch(newText)
            }}
            onFocus={() => {
              if (searchInputRef.current) {
                // set the native props directly to avoid useState delay
                searchInputRef.current.setNativeProps({
                  style: {
                    borderColor: isBCSCMode ? ColorPalette.brand.primary : ColorPalette.brand.primaryBackground,
                  },
                })
              }
            }}
            onBlur={() => {
              if (searchInputRef.current) {
                searchInputRef.current.setNativeProps({
                  style: { borderColor: isBCSCMode ? '#1E5189' : '#D8D8D8' },
                })
              }
            }}
            accessibilityLabel={a11yLabel(t('BCSC.Services.CatalogueSearch'))}
            testID={testIdWithKey('search')}
            style={styles.searchText}
          />
          {search.length > 0 ? (
            <Icon
              name="clear"
              size={24}
              color={ColorPalette.brand.tertiary}
              onPress={() => {
                Keyboard.dismiss()
                setSearch('')
              }}
              accessibilityLabel={a11yLabel(t('Global.Close'))}
              testID={testIdWithKey('clearSearch')}
            />
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator
          size={'large'}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          testID={testIdWithKey('ServicesLoading')}
        />
      ) : (
        <>
          <View style={styles.servicesContainer}>
            {serviceClients.map((service) => (
              <ServiceButton
                key={service.client_ref_id}
                title={service.client_name}
                description={service.client_description}
                onPress={() => {
                  navigation.navigate(BCSCScreens.ServiceLogin, {
                    serviceClientId: service.client_ref_id,
                  })
                }}
              />
            ))}
          </View>

          <View style={styles.bottomContainer}>
            <ThemedText variant={'bold'}>{t('BCSC.Services.NotListed')}</ThemedText>
            <ThemedText style={styles.desciptionText}>{t('BCSC.Services.NotListedDescription')}</ThemedText>
            <ThemedText style={[styles.desciptionText, { marginTop: Spacing.xl }]}>
              {t('BCSC.Services.NotListedDescriptionContact')}
            </ThemedText>
          </View>
        </>
      )}
    </TabScreenWrapper>
  )
}

export default Services
