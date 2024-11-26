import { Button, ButtonType, ToastType, TOKENS, useServices, useStore, useTheme } from '@hyperledger/aries-bifold-core'
import { StackNavigationProp } from '@react-navigation/stack'
import moment from 'moment'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TFunction, useTranslation } from 'react-i18next'
import { View, StyleSheet, SectionList, Text } from 'react-native'
import { ToastShowParams } from 'react-native-toast-message'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'

import NotificationListItem, { NotificationTypeEnum } from '../../components/NotificationListItem'
import { NotificationReturnType, NotificationsInputProps, NotificationType } from '../../hooks/notifications'
import { useToast } from '../../hooks/toast'
import { ActivitiesStackParams } from '../../navigators/navigators'
import { BCDispatchAction, BCState } from '../../store'
import { TabTheme } from '../../theme'

export type SelectedNotificationType = { id: string; deleteAction?: () => Promise<void> }

const iconSize = 24
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
  openSwipeableId: string | null
  handleOpenSwipeable: (id: string | null) => void
  navigation: StackNavigationProp<ActivitiesStackParams>
}> = ({ openSwipeableId, handleOpenSwipeable, navigation }) => {
  const [{ customNotificationConfig: customNotification, useNotifications }] = useServices([TOKENS.NOTIFICATIONS])
  const notifications = useNotifications({ isHome: false } as NotificationsInputProps)
  const [, dispatch] = useStore<BCState>()

  const [toastEnabled, setToastEnabled] = useState(false)
  const [toastOptions, setToastOptions] = useState<ToastShowParams>({})
  useToast({ enabled: toastEnabled, options: toastOptions })

  const [setions, setSections] = useState<SectionType[]>([])
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()

  const [selectedNotification, setSelectedNotification] = useState<SelectedNotificationType[] | null>(null)
  const hasCanceledRef = useRef(false)

  useEffect(() => {
    setSections(groupNotificationsByDate(notifications as NotificationReturnType, t))
  }, [notifications])

  useEffect(() => {
    if (selectedNotification != null) {
      navigation?.getParent()?.setOptions({ tabBarStyle: { display: 'none' } })
    } else {
      navigation?.getParent()?.setOptions({ tabBarStyle: { display: 'flex', ...TabTheme.tabBarStyle } })
    }
  }, [selectedNotification])

  const deleteMultipleNotifications = async () => {
    for await (const notif of selectedNotification ?? []) {
      await notif.deleteAction?.()
    }
  }

  const handleMultipleDelete = () => {
    const selected = selectedNotification ?? []
    if (selected.length > 0) {
      setToastOptions({
        type: ToastType.Info,
        text1: t('Activities.NotificationsDeleted', { count: selected.length }),
        onShow: () => {
          dispatch({
            type: BCDispatchAction.NOTIFICATIONS_TEMPORARILY_DELETED_IDS,
            payload: [...selected.map((s) => s.id)],
          })
        },
        onHide: () => {
          if (!hasCanceledRef.current) {
            deleteMultipleNotifications()
          }
          hasCanceledRef.current = false
          setToastEnabled(false)
        },
        props: {
          onCancel: () => {
            hasCanceledRef.current = true
            dispatch({
              type: BCDispatchAction.NOTIFICATIONS_TEMPORARILY_DELETED_IDS,
              payload: [],
            })
          },
        },
        position: 'bottom',
      })
      setToastEnabled(true)
    }
    setSelectedNotification(null)
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      zIndex: 1,
    },
    sectionList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.secondary,
    },
    bodyText: {
      ...TextTheme.labelSubtitle,
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
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    notificationContainer: {
      marginVertical: 16,
    },
    footerText: {
      ...TextTheme.labelSubtitle,
      color: ColorPallet.grayscale.mediumGrey,
    },
    selectionMultiActionContainer: {
      width: '100%',
      maxHeight: 200,
      position: 'absolute',
      shadowOffset: { width: 0, height: -3 },
      shadowColor: ColorPallet.grayscale.darkGrey,
      shadowOpacity: 0.1,
      shadowRadius: 5,
      bottom: 0,
      zIndex: 99,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    actionButtonContainer: {
      margin: 25,
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
            notificationType={NotificationTypeEnum.BasicMessage}
            notification={item}
            activateSelection={selectedNotification != null}
            selected={
              (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                0) > 0
            }
            setSelected={(item) => {
              if (
                (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                  0) > 0
              ) {
                setSelectedNotification(
                  selectedNotification?.filter((selectedNotification) => selectedNotification.id !== item.id) ?? []
                )
                return
              }
              setSelectedNotification([...(selectedNotification || []), item])
            }}
          />
        )
      } else if (item.type === 'CredentialRecord') {
        let notificationType = NotificationTypeEnum.CredentialOffer
        if (item.revocationNotification) {
          notificationType = NotificationTypeEnum.Revocation
        }
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={notificationType}
            notification={item}
            activateSelection={selectedNotification != null}
            selected={
              (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                0) > 0
            }
            setSelected={(item) => {
              if (
                (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                  0) > 0
              ) {
                setSelectedNotification(
                  selectedNotification?.filter((selectedNotification) => selectedNotification.id !== item.id) ?? []
                )
                return
              }
              setSelectedNotification([...(selectedNotification || []), item])
            }}
          />
        )
      } else if (item.type === 'CustomNotification' && customNotification) {
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={NotificationTypeEnum.Custom}
            notification={item}
            customNotification={customNotification}
            activateSelection={selectedNotification != null}
            selected={
              (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                0) > 0
            }
            setSelected={(item) => {
              if (
                (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                  0) > 0
              ) {
                setSelectedNotification(
                  selectedNotification?.filter((selectedNotification) => selectedNotification.id !== item.id) ?? []
                )
                return
              }
              setSelectedNotification([...(selectedNotification || []), item])
            }}
          />
        )
      } else {
        component = (
          <NotificationListItem
            openSwipeableId={openSwipeableId}
            onOpenSwipeable={handleOpenSwipeable}
            notificationType={NotificationTypeEnum.ProofRequest}
            notification={item}
            activateSelection={selectedNotification != null}
            selected={
              (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                0) > 0
            }
            setSelected={(item) => {
              if (
                (selectedNotification?.filter((selectedNotification) => selectedNotification.id === item.id)?.length ??
                  0) > 0
              ) {
                setSelectedNotification(
                  selectedNotification?.filter((selectedNotification) => selectedNotification.id !== item.id) ?? []
                )
                return
              }
              setSelectedNotification([...(selectedNotification || []), item])
            }}
          />
        )
      }

      return <View style={styles.notificationContainer}>{component}</View>
    },
    [openSwipeableId, handleOpenSwipeable, selectedNotification]
  )

  const renderSectionHeader = ({ section }: { section: SectionType }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={[styles.bodyText, styles.bodyEventTime]}>{section.title}</Text>
      <View style={styles.sectionSeparator} />
    </View>
  )

  return (
    <View style={styles.container}>
      <SectionList
        style={styles.sectionList}
        sections={setions}
        keyExtractor={(item: NotificationType) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderSectionHeader={renderSectionHeader}
        ListFooterComponent={
          <View style={selectedNotification != null && { paddingBottom: 200 }}>
            <Text style={[styles.footerText]}>{t('Activities.FooterNothingElse')}</Text>
          </View>
        }
      />
      {selectedNotification != null && (
        <View style={styles.selectionMultiActionContainer}>
          <View style={styles.actionButtonContainer}>
            <Button title={'Supprimer'} onPress={handleMultipleDelete} buttonType={ButtonType.ModalCritical}>
              <MaterialCommunityIcon name={'trash-can-outline'} size={iconSize} style={{ color: 'white' }} />
            </Button>
            <View style={{ height: 24 }} />
            <Button title={'Annuler'} onPress={() => setSelectedNotification(null)} buttonType={ButtonType.Secondary} />
          </View>
        </View>
      )}
    </View>
  )
}

export default NotificationsList
