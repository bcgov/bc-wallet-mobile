import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import { ThemedText, useStore, useTheme } from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useFilterServiceClients } from '../../services/hooks/useFilterServiceClients'
import { SavedServiceCard } from './SavedServiceCard'

type ServicesNavigationProp = StackNavigationProp<BCSCMainStackParams, BCSCScreens.ServiceLogin>

const SavedServices: React.FC = () => {
  const { ColorPalette, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const navigation = useNavigation<ServicesNavigationProp>()
  const { t } = useTranslation()
  const { updateSavedService } = useSecureActions()

  const { serviceClients } = useFilterServiceClients({
    serviceClientIdsFilter: store.bcscSecure.savedServices,
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
          {t('BCSC.Services.SavedServices')}
        </ThemedText>
      </View>

      {serviceClients.length === 0 ? (
        <ThemedText
          variant={'headingFour'}
          style={{ color: ColorPalette.brand.tertiary, fontWeight: 'normal', paddingHorizontal: Spacing.md }}
        >
          {t('BCSC.Services.NoSavedServices')}
        </ThemedText>
      ) : (
        serviceClients.map((serviceClient) => (
          <SavedServiceCard
            key={serviceClient.client_ref_id}
            title={serviceClient.client_name}
            onPress={() => {
              navigation.navigate(BCSCScreens.ServiceLogin, {
                serviceClientId: serviceClient.client_ref_id,
              })
            }}
            onRemove={() => {
              updateSavedService(serviceClient.client_ref_id, false)
            }}
          />
        ))
      )}
    </View>
  )
}

export default SavedServices
