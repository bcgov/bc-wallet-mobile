import { ProofState } from '@credo-ts/core'
import { useAgent, useProofById } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import SharedProofData from '@hyperledger/aries-bifold-core/App/components/misc/SharedProofData'
import { HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { GroupedSharedProofDataItem } from '@hyperledger/aries-bifold-verifier'
import { StackScreenProps } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import useHistoryDetailPageStyles from '../../hooks/useHistoryDetailPageStyles'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'
import { handleDeleteHistory } from '../../utils/historyUtils'
import { startCaseUnicode } from '../../utils/stringUtils'

type ProofHistoryDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.ProofHistoryDetails>

const ProofHistoryDetails: React.FC<ProofHistoryDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { t } = useTranslation()
  const { recordId, item, operation } = route.params
  const itemContent = item?.content as HistoryRecord
  const iconSize = 24
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])

  const [, setSharedProofDataItems] = useState<GroupedSharedProofDataItem[]>([])
  const record = useProofById(recordId)
  const styles = useHistoryDetailPageStyles()

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (record) {
      setIsLoading(false)
    }
  }, [record])

  const onSharedProofDataLoad = useCallback((data: GroupedSharedProofDataItem[]) => {
    setSharedProofDataItems(data)
    setIsLoading(false)
  }, [])

  const operationDate = itemContent?.createdAt
    ? formatTime(itemContent?.createdAt, { shortMonth: true, trim: true })
    : t('Record.InvalidDate')

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ColorPallet.brand.highlight} />
        <Text>{t('Global.Loading')}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.contentContainer, styles.headerStyle]}>
        <HeaderText title={t('History.CardDescription.Proof', { operation })} />
        <View style={{ marginTop: 20 }} />
        <Text style={styles.subTitle}>
          {itemContent?.correspondenceName ? startCaseUnicode(itemContent.correspondenceName) : ''}
        </Text>
        <Text style={styles.date}>
          {t('History.Date.changedOn', { operation: operation })} {operationDate}
        </Text>

        {record && record.state !== ProofState.Declined && (
          <SharedProofData recordId={record.id} onSharedProofDataLoad={onSharedProofDataLoad} />
        )}
      </ScrollView>

      <View style={styles.lineSeparator} />

      <TouchableOpacity
        style={styles.deleteContainer}
        onPress={() => handleDeleteHistory(item.content.id || '', agent, loadHistory, navigation, t)}
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

export default ProofHistoryDetails
