import { CredentialExchangeRecord } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import {
  CredentialCard,
  Record,
  TOKENS,
  useServices,
  useTheme,
  formatTime,
  useCredentialConnectionLabel,
  getCredentialIdentifiers,
  isValidAnonCredsCredential,
  buildFieldsFromAnonCredsCredential,
} from '@hyperledger/aries-bifold-core'
import { HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { BrandingOverlay } from '@hyperledger/aries-oca'
import { Attribute, CredentialOverlay } from '@hyperledger/aries-oca/build/legacy'
import { StackScreenProps } from '@react-navigation/stack'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import useHistoryDetailPageStyles from '../../hooks/useHistoryDetailPageStyles'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'
import { handleDeleteHistory } from '../../utils/historyUtils'
import { startCaseUnicode } from '../../utils/stringUtils'

type CardHistorydDetailsProp = StackScreenProps<ActivitiesStackParams, Screens.CardHistoryDetails>

const CardHistorydDetails: React.FC<CardHistorydDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { recordId, item, operation } = route.params
  const itemContent = item.content as HistoryRecord
  const iconSize = 24
  const { agent } = useAgent()
  const [bundleResolver, loadHistory] = useServices([TOKENS.UTIL_OCA_RESOLVER, TOKENS.FN_LOAD_HISTORY])
  const [credentialExists, setCredentialExists] = useState<boolean | null>(null)
  const styles = useHistoryDetailPageStyles()

  const [credentialDetails, setCredentialDetails] = useState<CredentialExchangeRecord | undefined>()
  const [isLoading, setIsLoading] = useState(true)
  const [overlay, setOverlay] = useState<CredentialOverlay<BrandingOverlay>>({
    bundle: undefined,
    presentationFields: [],
    metaOverlay: undefined,
    brandingOverlay: undefined,
  })

  const credentialConnectionLabel = useCredentialConnectionLabel(credentialDetails ?? undefined)

  useEffect(() => {
    if (!(credentialDetails && isValidAnonCredsCredential(credentialDetails))) {
      return
    }

    const params = {
      identifiers: getCredentialIdentifiers(credentialDetails),
      meta: {
        alias: credentialConnectionLabel,
        credConnectionId: credentialDetails.connectionId,
      },
      attributes: buildFieldsFromAnonCredsCredential(credentialDetails),
      language: i18n.language,
    }

    bundleResolver.resolveAllBundles(params).then((bundle) => {
      setOverlay((o) => ({
        ...o,
        ...(bundle as CredentialOverlay<BrandingOverlay>),
        presentationFields: bundle.presentationFields?.filter((field) => (field as Attribute).value),
      }))
    })
  }, [credentialDetails, credentialConnectionLabel, bundleResolver, i18n.language])

  const checkCredentialExists = async (id: string): Promise<void> => {
    try {
      const credentialExchangeRecord = await agent?.credentials.getById(id)
      setCredentialExists(credentialExchangeRecord !== null)
      setCredentialDetails(credentialExchangeRecord)
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
      <View style={styles.contentContainer}>
        <Record
          fields={overlay.presentationFields || []}
          header={() => (
            <View style={styles.headerStyle}>
              <HeaderText
                title={t('History.CardDescription.CardChanged', {
                  cardName: itemContent?.message ? startCaseUnicode(itemContent.message) : '',
                  operation: operation,
                  interpolation: { escapeValue: false },
                })}
              />

              <View style={{ marginTop: 20 }} />
              <Text style={styles.subTitle}>
                {itemContent?.correspondenceName ? startCaseUnicode(itemContent?.correspondenceName) : ''}
              </Text>
              <Text style={styles.date}>
                {t('History.Date.changedOn', { operation: operation })} {operationDate}
              </Text>
              {credentialExists && <CredentialCard credential={credentialDetails as CredentialExchangeRecord} />}
            </View>
          )}
        />
      </View>
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
