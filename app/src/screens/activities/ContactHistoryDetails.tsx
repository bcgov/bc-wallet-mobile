import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'
import { handleDeleteHistory } from '../../utils/historyUtils'

type ContactHistoryDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.ContactHistoryDetails>

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

const ContactHistoryDetails: React.FC<ContactHistoryDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { item, operation } = route.params
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])
  const itemContent = item?.content as HistoryRecord

  const modifiedDate = itemContent.createdAt
    ? formatTime(new Date(itemContent.createdAt), { shortMonth: true, trim: true })
    : t('Record.InvalidDate')

  const iconSize = 24

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <HeaderText
          title={t('History.CardDescription.ContactUpdated', {
            contactName: itemContent.correspondenceName,
            operation: operation,
          })}
        />

        <View style={{ marginTop: 20 }} />
        <Text style={[TextTheme.normal, styles.subTitle]}>
          {t('History.Date.changedOn', { operation: operation })} {modifiedDate}
        </Text>
      </ScrollView>

      <View style={styles.lineSeparator} />

      <TouchableOpacity
        style={styles.deleteContainer}
        onPress={() => handleDeleteHistory(itemContent.id || '', agent, loadHistory, navigation, t)}
      >
        <MaterialCommunityIcon name={'trash-can-outline'} size={iconSize} style={styles.trashIcon} />
        <Text style={[TextTheme.normal, styles.deleteText]}>{t('History.Button.DeleteHistory')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default ContactHistoryDetails
