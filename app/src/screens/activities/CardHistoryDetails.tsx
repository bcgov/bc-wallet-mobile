import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { HistoryCardType, HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { StackScreenProps } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import useHistoryDetailPageStyles from '../../hooks/useHistoryDetailPageStyles'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'
import { handleDeleteHistory, renderCardIcon } from '../../utils/historyUtils'
import { startCaseUnicode } from '../../utils/stringUtils'

type CardHistorydDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.CardHistoryDetails>

const CardHistorydDetails: React.FC<CardHistorydDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { t } = useTranslation()
  const { recordId, item, operation } = route.params
  const itemContent = item.content as HistoryRecord
  const iconSize = 24
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])
  const [credentialExists, setCredentialExists] = useState<boolean | null>(null)
  const styles = useHistoryDetailPageStyles()

  interface CredentialDetails {
    credentialAttributes: { name: string; value: string }[]
  }

  const [credentialDetails, setCredentialDetails] = useState<CredentialDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkCredentialExists = async (id: string): Promise<void> => {
    try {
      const credentialExchangeRecord = await agent?.credentials.getById(id)
      setCredentialExists(credentialExchangeRecord !== null)
      setCredentialDetails(credentialExchangeRecord ? JSON.parse(JSON.stringify(credentialExchangeRecord)) : null)
    } catch (error) {
      setCredentialExists(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (recordId) {
      checkCredentialExists(recordId)
    } else {
      setCredentialExists(false)
      setIsLoading(false)
    }
  }, [recordId])

  const renderDetails = () => {
    if (!credentialDetails || !Array.isArray(credentialDetails.credentialAttributes)) return null

    // Map the attribute names to the desired labels
    const attributeMap = {
      student_first_name: t('History.Details.FirstName'),
      student_last_name: t('History.Details.LastName'),
      birthday: t('History.Details.Birthday'),
      address: t('History.Details.Address'),
      city: t('History.Details.City'),
      province: t('History.Details.Province'),
      postal_code: t('History.Details.PostalCode'),
    }

    return Object.entries(attributeMap).map(([attributeName, label]) => {
      const attribute = credentialDetails.credentialAttributes.find((attr) => attr.name === attributeName)
      return attribute ? (
        <View key={attributeName} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValue}>{attribute.value}</Text>
        </View>
      ) : null
    })
  }

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
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <HeaderText
          title={t('History.CardDescription.CardChanged', {
            cardName: itemContent?.message ? startCaseUnicode(itemContent?.message) : '',
            operation: operation,
          })}
        />
        <View style={{ marginTop: 20 }} />
        <Text style={styles.subTitle}>{itemContent?.correspondenceName}</Text>
        <Text style={styles.date}>
          {t('History.Date.changedOn', { operation: operation })} {operationDate}
        </Text>
        <View style={styles.card}>
          <View
            style={[
              styles.verticalBar,
              { backgroundColor: credentialExists ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey },
            ]}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{itemContent?.message ? startCaseUnicode(itemContent?.message) : ''}</Text>
            {credentialExists && (
              <Text style={styles.cardSubtitleName}>
                {`${
                  credentialDetails?.credentialAttributes?.find((attr) => attr.name === 'student_first_name')?.value ||
                  ''
                } ${
                  credentialDetails?.credentialAttributes?.find((attr) => attr.name === 'student_last_name')?.value ||
                  ''
                }`}
              </Text>
            )}
            <View style={styles.cardSubtitleRow}>
              {renderCardIcon(itemContent?.type as HistoryCardType)}
              <Text style={styles.cardSubtitle}>
                {itemContent?.correspondenceName ? startCaseUnicode(itemContent?.correspondenceName) : ''}
              </Text>
            </View>
          </View>
        </View>
        {credentialExists && <View style={styles.detailsContainer}>{renderDetails()}</View>}
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

export default CardHistorydDetails
