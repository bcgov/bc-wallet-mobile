import { useTheme } from '@hyperledger/aries-bifold-core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'

import { ActivitiesStackParams } from '../../navigators/navigators'

import HistoryList from './HistoryList'
import NotificationsList from './NotificationsList'

const NotificationTab = 'Notifications'
const HistoryTab = 'Historique'

export type ActivitiesProps = {
  navigation: StackNavigationProp<ActivitiesStackParams>
}

const Activities: React.FC<ActivitiesProps> = ({ navigation }) => {
  const [openSwipeableId, setOpenSwipeableId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(NotificationTab)
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 16,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    tabHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      gap: 8,
      borderBottomColor: ColorPallet.brand.secondary,
      marginBottom: 16,
      marginHorizontal: 16,
      alignItems: 'center',
      maxHeight: 70,
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
      <View style={styles.tabHeader} accessibilityRole="tablist">
        <TouchableOpacity
          accessibilityState={{ selected: activeTab === NotificationTab }}
          accessibilityRole="tab"
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
          accessibilityState={{ selected: activeTab === HistoryTab }}
          accessibilityRole="tab"
          style={[styles.tab, activeTab === HistoryTab && styles.activeTab]}
          onPress={() => setActiveTab(HistoryTab)}
        >
          <Text style={[styles.tabText, activeTab === HistoryTab && styles.activeTabText]}>{t('Screens.History')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === NotificationTab ? (
        <NotificationsList openSwipeableId={openSwipeableId} handleOpenSwipeable={setOpenSwipeableId} />
      ) : (
        <HistoryList
          openSwipeableId={openSwipeableId}
          handleOpenSwipeable={setOpenSwipeableId}
          navigation={navigation}
        />
      )}
    </View>
  )
}

export default Activities
