import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { HistoryCardType, HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { StackScreenProps } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'
import { handleDeleteHistory, renderCardIcon } from '../../utils/historyUtils'

type CardChangedDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.CardChangedDetails>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: ColorPallet.grayscale.mediumGrey,
    marginBottom: 20,
  },
  card: {
    backgroundColor: ColorPallet.grayscale.veryLightGrey,
    padding: 15,
    gap: 16,
    alignItems: 'center',

    // Ombre portée équivalente à `box-shadow`
    shadowColor: 'rgba(34, 54, 84, 0.24)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    // Pour Android, car `shadow*` ne fonctionne pas sur Android
    elevation: 4,
  },
  cardContent: {
    marginLeft: 16,
    textAlign: 'left',
  },
  verticalBar: {
    width: 40,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: ColorPallet.grayscale.mediumGrey,
    textAlign: 'right',
    marginLeft: 8,
  },
  cardSubtitleName: {
    fontSize: 14,
    color: ColorPallet.grayscale.mediumGrey,
  },
  detailsContainer: {
    paddingBottom: 34,
  },
  detailRow: {
    marginBottom: 8,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: ColorPallet.brand.secondary,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: ColorPallet.grayscale.mediumGrey,
  },
  cardSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    right: 0,
    textAlign: 'right',
    justifyContent: 'flex-end',
  },
})

const CardChangedDetails: React.FC<CardChangedDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { t } = useTranslation()
  const { recordId, item, operation } = route.params
  const itemContent = item.content as HistoryRecord
  const iconSize = 24
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])
  const [credentialExists, setCredentialExists] = useState<boolean | null>(null)
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
    ? formatTime(new Date(itemContent?.createdAt), { shortMonth: true, trim: true })
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
            cardName: itemContent?.message || '',
            operation: operation,
          })}
        />
        <View style={{ marginTop: 20 }} />
        <Text style={styles.subtitle}>{itemContent?.correspondenceName}</Text>
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
            <Text style={styles.cardTitle}>{t('History.CardDescription.Default')}</Text>
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
              <Text style={styles.cardSubtitle}>{itemContent?.correspondenceName}</Text>
            </View>
          </View>
        </View>
        {credentialExists && <View style={styles.detailsContainer}>{renderDetails()}</View>}
      </ScrollView>

      <View style={styles.lineSeparator} />

      <TouchableOpacity
        style={styles.deleteContainer}
        onPress={() => handleDeleteHistory(item.content.id || '', agent, loadHistory, navigation, t)}
      >
        <MaterialCommunityIcon name={'trash-can-outline'} size={iconSize} style={styles.trashIcon} />
        <Text style={[TextTheme.normal, styles.deleteText]}>{t('History.Button.DeleteHistory')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default CardChangedDetails
