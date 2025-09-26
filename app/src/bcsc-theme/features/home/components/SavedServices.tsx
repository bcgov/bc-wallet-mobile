import { ThemedText, useStore, useTheme } from '@bifold/core'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFilterServiceClients } from '../../services/hooks/useFilterServiceClients'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { SavedServiceCard } from './SavedServiceCard'

type ServicesNavigationProp = StackNavigationProp<BCSCRootStackParams, BCSCScreens.ServiceLoginScreen>

const SavedServices: React.FC = () => {
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const navigation = useNavigation<ServicesNavigationProp>()
  const { t } = useTranslation()

  const { serviceClients } = useFilterServiceClients({
    serviceClientIdsFilter: store.bcsc.bookmarks,
  })

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
      marginLeft: -Spacing.xs,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Icon name="bookmark" size={24} color={ColorPalette.brand.tertiary} style={styles.bookmarkIcon} />
        <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.tertiary }}>
          {t('Services.SavedServices')}
        </ThemedText>
      </View>

      {serviceClients.length === 0 ? (
        <ThemedText
          variant={'headingFour'}
          style={{ color: ColorPalette.brand.tertiary, fontWeight: 'normal', paddingHorizontal: Spacing.md }}
        >
          {t('Services.NoSavedServices')}
        </ThemedText>
      ) : (
        serviceClients.map((serviceClient) => (
          <SavedServiceCard
            key={serviceClient.client_ref_id}
            title={serviceClient.client_name}
            onPress={() => {
              navigation.navigate(BCSCScreens.ServiceLoginScreen, {
                serviceClient: serviceClient,
              })
            }}
            onRemove={() => {
              dispatch({ type: BCDispatchAction.REMOVE_BOOKMARK, payload: [serviceClient.client_ref_id] })
            }}
          />
        ))
      )}
    </View>
  )
}

export default SavedServices
