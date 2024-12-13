import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'

type BiometricChangeDetailsRouteProp = RouteProp<ActivitiesStackParams, Screens.BiometricChangeDetails>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorPallet.brand.primaryBackground,
  },
  contentContainer: {
    height: '100%',
    padding: 20,
    backgroundColor: ColorPallet.brand.primaryBackground,
  },
  mainTitle: {
    marginBottom: 16,
  },
  separator: {
    width: 48,
    height: 2,
    backgroundColor: ColorPallet.brand.highlight,
    marginBottom: 18,
  },
  subTitle: {
    marginBottom: 20,
    color: ColorPallet.grayscale.mediumGrey,
  },
  lineSeparator: {
    borderBottomWidth: 1,
    marginHorizontal: 16,
    borderBottomColor: ColorPallet.brand.secondary,
  },
  deleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  trashIcon: {
    color: ColorPallet.notification.errorText,
  },
  deleteText: {
    color: ColorPallet.notification.errorText,
  },
})

const BiometricChangeDetails: React.FC = () => {
  const { TextTheme } = useTheme()
  const route = useRoute<BiometricChangeDetailsRouteProp>()
  const { item, operation } = route.params
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])

  const modifiedDate = item?.content.createdAt
    ? formatTime(new Date(item.content.createdAt), { shortMonth: true, trim: true })
    : t('Record.InvalidDate')

  const iconSize = 24

  const handleDeleteEvent = async () => {
    Alert.alert(
      t('History.Button.DeleteEvent'),
      t('History.ConfirmDeleteEvent'),
      [
        { text: t('Global.Cancel'), style: 'cancel' },
        {
          text: t('Global.Confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const historyManager = agent ? loadHistory(agent) : undefined
              if (historyManager) {
                const record = await historyManager.findGenericRecordById(item.content.id || '')
                if (record) {
                  await historyManager.removeGenericRecord(record)
                  navigation.goBack()
                }
              }
            } catch (error) {
              //console.error('Failed to delete event:', error)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <HeaderText title={t('History.CardDescription.BiometricUpdated', { operation })} />
        <View style={{ marginTop: 20 }} />
        <Text style={[TextTheme.normal, styles.subTitle]}>
          {t('Date.ModifiedOn')} {modifiedDate}
        </Text>
      </ScrollView>

      <View style={styles.lineSeparator} />

      <TouchableOpacity style={styles.deleteContainer} onPress={handleDeleteEvent}>
        <MaterialCommunityIcon name={'trash-can-outline'} size={iconSize} style={styles.trashIcon} />
        <Text style={[TextTheme.normal, styles.deleteText]}>{t('History.Button.DeleteEvent')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default BiometricChangeDetails
