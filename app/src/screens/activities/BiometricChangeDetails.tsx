import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
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

type BiometricChangeDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.BiometricChangeDetails>

const BiometricChangeDetails: React.FC<BiometricChangeDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { item, operation } = route.params
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])
  const styles = useHistoryDetailPageStyles()

  const modifiedDate = item?.content.createdAt
    ? formatTime(item.content.createdAt, { shortMonth: true, trim: true })
    : t('Record.InvalidDate')

  const iconSize = 24

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, styles.headerStyle]}>
        <HeaderText title={t('History.CardDescription.BiometricUpdated', { operation })} />
        <View style={{ marginTop: 20 }} />
        <Text style={[TextTheme.normal, styles.subTitle]}>
          {t('Date.ModifiedOn')} {modifiedDate}
        </Text>
      </ScrollView>

      <View style={styles.lineSeparator} />

      <TouchableOpacity
        style={styles.deleteContainer}
        onPress={() => handleDeleteHistory(item.content.id || '', agent, loadHistory, navigation, t)}
        accessibilityLabel={t('History.Button.DeleteHistory')}
        accessibilityRole="button"
      >
        <MaterialCommunityIcon
          name={'trash-can-outline'}
          size={iconSize}
          style={styles.trashIcon}
          accessibilityLabel={t('History.Icon.Delete')}
          accessibilityRole="image"
        />
        <Text style={[TextTheme.normal, styles.deleteText]}>{t('History.Button.DeleteHistory')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default BiometricChangeDetails
