import { useAgent } from '@credo-ts/react-hooks'
import { HistoryCardType } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import Toast from 'react-native-toast-message'

import { ActivitiesStackParams, Screens } from '../../navigators/navigators'
import { Buttons, ColorPallet, TextTheme } from '../../theme'

type HistoryDetailRouteProp = RouteProp<ActivitiesStackParams, Screens.HistoryDetail>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorPallet.brand.primaryBackground,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  title: {
    fontFamily: TextTheme.headingOne.fontFamily,
    fontSize: TextTheme.headingOne.fontSize,
    fontWeight: '700',
    color: ColorPallet.notification.infoText,
    marginBottom: 2,
  },
  headerLine: {
    width: 48,
    height: 4,
    backgroundColor: ColorPallet.brand.highlight,
    marginVertical: 8,
  },
  subTitle: {
    fontWeight: TextTheme.labelTitle.fontWeight,
    color: ColorPallet.notification.successText,
    marginBottom: 4,
  },
  date: {
    color: ColorPallet.grayscale.mediumGrey,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: TextTheme.headingThree.fontWeight,
    color: ColorPallet.notification.infoIcon,
    marginVertical: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(34, 54, 84, 0.24)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    borderLeftWidth: 16,
    borderLeftColor: ColorPallet.brand.primary,
    marginBottom: 16,
  },
  infoTitle: {
    fontWeight: TextTheme.labelTitle.fontWeight,
    color: ColorPallet.notification.infoText,
    marginBottom: 8,
  },
  infoText: {
    color: ColorPallet.notification.infoText,
    lineHeight: 24,
    marginBottom: 8,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingVertical: 12,
    borderTopWidth: 0.2,
    borderTopColor: ColorPallet.brand.primaryLight,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontWeight: TextTheme.labelTitle.fontWeight,
    color: Buttons.critical.backgroundColor,
  },
})

const HistoryDetail: React.FC = () => {
  const route = useRoute<HistoryDetailRouteProp>()
  const navigation = useNavigation()
  const { item } = route.params
  const { t } = useTranslation()
  const { agent } = useAgent()

  const isHistoryRecordWithDetails = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any
  ): content is {
    type: HistoryCardType
    message: string
    correspondenceName: string
    createdAt: string
    correspondenceId: string
    emailAddress: string
  } => content?.type && content?.message && content?.correspondenceName && content?.createdAt

  const type = isHistoryRecordWithDetails(item.content) ? item.content.type : undefined
  const message = isHistoryRecordWithDetails(item.content) ? item.content.message : t('No message available')
  const correspondenceName = isHistoryRecordWithDetails(item.content)
    ? item.content.correspondenceName
    : t('No correspondent')
  const createdAt =
    isHistoryRecordWithDetails(item.content) && item.content.createdAt ? new Date(item.content.createdAt) : new Date()
  const correspondenceId = isHistoryRecordWithDetails(item.content) ? item.content.correspondenceId : 'N/A'
  const emailAddress = isHistoryRecordWithDetails(item.content) ? item.content.emailAddress : 'N/A'

  const removeHistoryItem = async () => {
    if (!agent) return

    try {
      const recordId = item.content?.id || ''
      if (!recordId) throw new Error('Record ID is missing.')
      const record = await agent.genericRecords.findById(recordId)
      if (record) {
        await agent.genericRecords.delete(record)
        Toast.show({
          type: 'success',
          text1: t('Global.Success'),
        })
        navigation.goBack() // Go back after deletion
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('Global.Failure'),
      })
    }
  }

  const renderContentBasedOnType = () => {
    switch (type) {
      case HistoryCardType.CardAccepted:
      case HistoryCardType.CardDeclined:
      case HistoryCardType.InformationSent:
        return (
          <>
            <Text style={styles.sectionTitle}>{t('The requested information')}</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t(`History.CardTitle.${type}`)}</Text>
              <Text style={styles.infoText}>{correspondenceName}</Text>
              <Text style={styles.infoText}>
                {t('Unique identifier')}: {correspondenceId}
              </Text>
              <Text style={styles.infoText}>
                {t('Email address')}: {emailAddress}
              </Text>
            </View>
          </>
        )
      case HistoryCardType.PinChanged:
        return <Text style={styles.infoText}>{t('History.CardDescription.WalletPinUpdated')}</Text>
      default:
        return <Text style={styles.infoText}>{t('History.Detail.Default')}</Text>
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{message}</Text>
        <View style={styles.headerLine} />
        <Text style={styles.subTitle}>{correspondenceName}</Text>
        <Text style={styles.date}>{new Date(createdAt).toLocaleDateString('en-US', { dateStyle: 'full' })}</Text>
        {renderContentBasedOnType()}
      </ScrollView>

      <TouchableOpacity style={styles.deleteButton} onPress={removeHistoryItem}>
        <Text style={styles.deleteButtonText}>{t('Delete event')}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default HistoryDetail
