import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import { HistoryRecord } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import HeaderText from '../../components/HeaderText'
import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { ColorPallet } from '../../theme'
import { handleDeleteHistory } from '../../utils/historyUtils'

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
  verticalBar: {
    width: 40,
    backgroundColor: ColorPallet.grayscale.mediumGrey,
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
    marginLeft: '10%',
  },
  cardSubtitle: {
    fontSize: 14,
    color: ColorPallet.grayscale.mediumGrey,
    marginLeft: '35%',
  },
})

const CardChangedDetails: React.FC<CardChangedDetailsProp> = ({ route, navigation }) => {
  const { TextTheme } = useTheme()
  const { t } = useTranslation()
  const { item, operation } = route.params
  const itemContent = item.content as HistoryRecord
  const iconSize = 24
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])

  const operationDate = itemContent?.createdAt
    ? formatTime(new Date(itemContent?.createdAt), { shortMonth: true, trim: true })
    : t('Record.InvalidDate')

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
          <View style={styles.verticalBar} />
          <Text style={styles.cardTitle}>{t('Attestation numérique d’identité gouvernementale')}</Text>
          <Text style={styles.cardSubtitle}>{itemContent?.correspondenceName}</Text>
        </View>
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
