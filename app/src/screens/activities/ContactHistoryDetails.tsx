import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, TouchableOpacity } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import useHistoryDetailPageStyles from '../../hooks/useHistoryDetailPageStyles'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { handleDeleteHistory } from '../../utils/historyUtils'
import { startCaseUnicode } from '../../utils/stringUtils'

type ContactHistoryDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.ContactHistoryDetails>

const ContactHistoryDetails: React.FC<ContactHistoryDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { item, operation } = route.params
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])
  const itemContent = item?.content as HistoryRecord
  const styles = useHistoryDetailPageStyles()
  const modifiedDate = itemContent.createdAt
    ? formatTime(itemContent.createdAt, { shortMonth: true, trim: true })
    : t('Record.InvalidDate')

  const iconSize = 24

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, styles.headerStyle]}>
        <HeaderText
          title={t('History.CardDescription.ContactUpdated', {
            contactName: itemContent.correspondenceName ? startCaseUnicode(itemContent.correspondenceName) : '',
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
        accessibilityRole="button"
        accessibilityLabel={t('History.Button.DeleteHistory')}
      >
        <MaterialCommunityIcon
          name={'trash-can-outline'}
          size={iconSize}
          style={styles.trashIcon}
          accessibilityRole="image"
          accessibilityLabel={t('History.Icon.Delete')}
        />
        <Text style={[TextTheme.normal, styles.deleteText]}>{t('History.Button.DeleteHistory')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default ContactHistoryDetails
