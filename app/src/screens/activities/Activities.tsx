import { TOKENS, useServices, useTheme } from '@hyperledger/aries-bifold-core'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'

import { NotificationReturnType, NotificationsInputProps } from '../../hooks/notifications'

import HistoryList from './HistoryList'
import NotificationsList from './NotificationsList'

const NotificationTab = 'Notifications'
const HistoryTab = 'Historique'

const Activities: React.FC = () => {
  const [openSwipeableId, setOpenSwipeableId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(NotificationTab)
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()

  const [{ customNotificationConfig: customNotification, useNotifications }] = useServices([TOKENS.NOTIFICATIONS])
  const notifications = useNotifications({ isHome: false } as NotificationsInputProps)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    tabHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      gap: 32,
      borderBottomColor: ColorPallet.brand.secondary,
      marginBottom: 16,
      alignItems: 'center',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingBottom: 8,
      paddingHorizontal: 8,
      borderBottomWidth: 4,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomWidth: 4,
      borderBottomColor: ColorPallet.brand.primary,
    },
    tabText: {
      ...TextTheme.labelTitle,
    },
    activeTabText: {
      color: ColorPallet.brand.primary,
    },
    tabContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  })

  return (
    <View style={styles.container}>
      {/* Tab-like Header */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === NotificationTab && styles.activeTab]}
          onPress={() => setActiveTab(NotificationTab)}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, activeTab === NotificationTab && styles.activeTabText]}>
              {t('Screens.Notifications')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === HistoryTab && styles.activeTab]}
          onPress={() => setActiveTab(HistoryTab)}
        >
          <Text style={[styles.tabText, activeTab === HistoryTab && styles.activeTabText]}>{t('Screens.History')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === NotificationTab ? (
        <NotificationsList
          notifications={notifications as NotificationReturnType}
          customNotification={customNotification}
          openSwipeableId={openSwipeableId}
          handleOpenSwipeable={setOpenSwipeableId}
        />
      ) : (
        <HistoryList />
      )}
    </View>
  )
}

export default Activities
