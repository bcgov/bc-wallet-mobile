import { useTheme } from '@hyperledger/aries-bifold-core'
import { CustomNotification } from '@hyperledger/aries-bifold-core/App/types/notification'
import moment from 'moment'
import React, { useCallback, useEffect, useState } from 'react'
import { TFunction, useTranslation } from 'react-i18next'
import { View, StyleSheet, SectionList, Text } from 'react-native'

import NotificationListItem, { NotificationType as enumNotificationType } from '../../components/NotificationListItem'
import { NotificationReturnType, NotificationType } from '../../hooks/notifications'

// Function to group notifications by date
const groupNotificationsByDate = (notifications: NotificationReturnType, t: TFunction<'translation', undefined>) => {
  const groupedNotifications: { [key: string]: NotificationReturnType } = {
    today: [],
    thisWeek: [],
    lastWeek: [],
    older: [],
  }

  notifications.forEach((notification) => {
    const notificationDate = moment(notification.createdAt)
    const today = moment()

    if (notificationDate.isSame(today, 'day')) {
      groupedNotifications.today.push(notification)
    } else if (notificationDate.isSame(today, 'week')) {
      groupedNotifications.thisWeek.push(notification)
    } else if (notificationDate.isSame(today.subtract(1, 'week'), 'week')) {
      groupedNotifications.lastWeek.push(notification)
    } else {
      groupedNotifications.older.push(notification)
    }
  })

  const sections = []

  if (groupedNotifications.today.length > 0) {
    sections.push({ title: t('Activities.Timing.Today'), data: groupedNotifications.today })
  }
  if (groupedNotifications.thisWeek.length > 0) {
    sections.push({ title: t('Activities.Timing.ThisWeek'), data: groupedNotifications.thisWeek })
  }
  if (groupedNotifications.lastWeek.length > 0) {
    sections.push({ title: t('Activities.Timing.LastWeek'), data: groupedNotifications.lastWeek })
  }
  if (groupedNotifications.older.length > 0) {
    sections.push({ title: t('Activities.Timing.Older'), data: groupedNotifications.older })
  }

  return sections
}

type SectionType = { title: string; data: NotificationReturnType }

const NotificationsList: React.FC<{
  notifications: NotificationReturnType
  customNotification: CustomNotification | undefined
  openSwipeableId: string | null
  handleOpenSwipeable: (id: string | null) => void
}> = ({ notifications, customNotification, openSwipeableId, handleOpenSwipeable }) => {
  const [setions, setSections] = useState<SectionType[]>([])
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()

  useEffect(() => {
    setSections(groupNotificationsByDate(notifications as NotificationReturnType, t))
  }, [notifications])

  const styles = StyleSheet.create({
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.secondary,
      marginVertical: 8,
    },
    bodyText: {
      ...TextTheme.labelTitle,
    },
    bodyEventTime: {
      marginTop: 8,
      color: ColorPallet.grayscale.mediumGrey,
      fontSize: 12,
    },
    sectionSeparator: {
      height: 1,
      backgroundColor: ColorPallet.brand.secondary,
      marginTop: 4,
    },
    sectionHeaderContainer: {
      marginBottom: 12,
    },
    notificationContainer: {
      marginTop: 12,
    },
    footerText: {
      ...TextTheme.labelSubtitle,
      color: ColorPallet.grayscale.mediumGrey,
    },
  })

  const renderItem = useCallback(
    ({ item }: { item: NotificationType }) => {
      let component = null

      if (item.type === 'BasicMessageRecord') {
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={enumNotificationType.BasicMessage}
            notification={item}
          />
        )
      } else if (item.type === 'CredentialRecord') {
        let notificationType = enumNotificationType.CredentialOffer
        if (item.revocationNotification) {
          notificationType = enumNotificationType.Revocation
        }
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={notificationType}
            notification={item}
          />
        )
      } else if (item.type === 'CustomNotification' && customNotification) {
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={enumNotificationType.Custom}
            notification={item}
            customNotification={customNotification}
          />
        )
      } else {
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={enumNotificationType.ProofRequest}
            notification={item}
          />
        )
      }

      return (
        <View style={styles.notificationContainer}>
          {component}
          <View style={styles.separator} />
        </View>
      )
    },
    [openSwipeableId, handleOpenSwipeable]
  )

  const renderSectionHeader = ({ section }: { section: SectionType }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.bodyText, styles.bodyEventTime]}>{section.title}</Text>
      <View style={styles.sectionSeparator} />
    </View>
  )

  return (
    <SectionList
      sections={setions}
      keyExtractor={(item: NotificationType) => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListFooterComponent={<Text style={[styles.footerText]}>{t('Activities.FooterNothingElse')}</Text>}
    />
  )
}

export default NotificationsList
