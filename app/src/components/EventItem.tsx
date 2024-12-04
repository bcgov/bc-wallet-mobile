import { GenericFn, testIdWithKey, ToastType, useStore, useTheme } from '@hyperledger/aries-bifold-core'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { ToastShowParams } from 'react-native-toast-message'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'

import { hitSlop } from '../constants'
import { useToast } from '../hooks/toast'
import { BCDispatchAction, BCState } from '../store'

const iconSize = 20

interface EventItemProps {
  action?: GenericFn
  handleDelete?: () => Promise<void>
  isRead?: boolean
  isHome?: boolean
  event: {
    id: string
    title?: string
    body?: string
    eventTime?: string
    image: JSX.Element
  }
  openSwipeableId: string | null
  onOpenSwipeable: (id: string | null) => void
  activateSelection?: boolean
  setSelected?: ({ id, deleteAction }: { id: string; deleteAction?: () => Promise<void> }) => void
}

const EventItem = ({
  action,
  handleDelete,
  event,
  openSwipeableId,
  onOpenSwipeable,
  activateSelection,
  setSelected,
  isRead = true,
  isHome,
}: EventItemProps): React.JSX.Element => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const hasCanceledRef = useRef(false)
  const [toastEnabled, setToastEnabled] = useState(false)
  const [toastOptions, setToastOptions] = useState<ToastShowParams>({})
  const [, dispatch] = useStore<BCState>()
  useToast({ enabled: toastEnabled, options: toastOptions })

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: !isHome && !isRead ? ColorPallet.notification.info : ColorPallet.grayscale.white,
      zIndex: 9999,
      ...(!isHome && {
        padding: 16,
      }),
      gap: 8,
    },
    infoContainer: {
      flex: 2,
    },
    arrowContainer: {
      justifyContent: 'center',
    },
    headerText: {
      ...TextTheme.labelTitle,
      flexGrow: 1,
      flex: 1,
    },
    bodyText: {
      ...TextTheme.labelSubtitle,
      marginVertical: 8,
    },
    bodyEventTime: {
      ...TextTheme.labelSubtitle,
      color: ColorPallet.grayscale.mediumGrey,
      fontSize: 12,
    },
    icon: {
      width: 24,
      height: 24,
    },
    rightAction: {
      padding: 8,
      backgroundColor: ColorPallet.semantic.error,
      minWidth: 120,
      justifyContent: 'center',
      flex: 1,
      marginVertical: 'auto',
      alignItems: 'center',
    },
    rightActionIcon: {
      color: ColorPallet.brand.secondary,
    },
    rightActionText: {
      color: ColorPallet.brand.secondary,
      fontSize: 14,
      fontWeight: '600',
    },
  })

  const swipeableRef = useRef<Swipeable>(null)

  const handleSwipeClose = () => {
    if (openSwipeableId === event.id) {
      onOpenSwipeable(null) // Close the current swipeable
    }
  }

  const handleSwipeOpen = () => {
    onOpenSwipeable(event.id) // Call the parent function to notify which item is opened
  }

  const pressAction = () => {
    if (activateSelection) {
      setSelected?.({ id: event.id, deleteAction: handleDelete })
    } else {
      action?.()
    }
  }

  // Close the swipeable if it is not the currently open one
  useEffect(() => {
    if (openSwipeableId != event.id) {
      swipeableRef?.current?.close()
    }
  }, [openSwipeableId, swipeableRef.current])

  const body = (
    <Pressable
      accessibilityLabel={t('Global.View')}
      accessibilityRole={'button'}
      testID={testIdWithKey(`View${event.id}`)}
      onPress={pressAction}
      hitSlop={hitSlop}
      onLongPress={() => {
        setSelected?.({ id: event.id, deleteAction: handleDelete })
      }}
    >
      <View style={[styles.container]} testID={testIdWithKey('NotificationListItem')}>
        {event.image}
        <View style={styles.infoContainer}>
          <Text style={[styles.headerText]} testID={testIdWithKey('HeaderText')}>
            {event.title}
          </Text>
          <Text style={[styles.bodyText]} testID={testIdWithKey('BodyText')}>
            {event.body}
          </Text>
          <Text style={styles.bodyEventTime} testID={testIdWithKey('BodyEventTime')}>
            {event.eventTime}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <MaterialIcon name={'keyboard-arrow-right'} size={iconSize} />
        </View>
      </View>
    </Pressable>
  )

  const rightSwipeAction = () => {
    const onDelete = () => {
      handleSwipeClose()
      setToastOptions({
        type: ToastType.Info,
        text1: t('Activities.NotificationsDeleted', { count: 1 }),
        onShow() {
          dispatch({
            type: BCDispatchAction.ACTIVITY_TEMPORARILY_DELETED_IDS,
            payload: [
              {
                [event.id]: {
                  isRead,
                  isTempDeleted: true,
                },
              },
            ],
          })
        },
        onHide: () => {
          if (!hasCanceledRef.current) {
            handleDelete?.()
          }
          hasCanceledRef.current = false
          setToastEnabled(false)
        },
        props: {
          onCancel: () => {
            hasCanceledRef.current = true
            dispatch({
              type: BCDispatchAction.ACTIVITY_TEMPORARILY_DELETED_IDS,
              payload: [
                {
                  [event.id]: {
                    isRead,
                    isTempDeleted: false,
                  },
                },
              ],
            })
          },
        },
        position: 'bottom',
      })
      setToastEnabled(true)
    }
    return (
      <TouchableOpacity onPress={onDelete}>
        <View style={styles.rightAction}>
          <MaterialCommunityIcon name={'trash-can-outline'} size={20} style={styles.rightActionIcon} />
          <Text style={styles.rightActionText}>{t('Notifications.Dismiss')}</Text>
        </View>
      </TouchableOpacity>
    )
  }
  return (
    <Swipeable
      ref={swipeableRef}
      onSwipeableWillOpen={handleSwipeOpen}
      onSwipeableClose={handleSwipeClose}
      renderRightActions={rightSwipeAction}
    >
      {body}
    </Swipeable>
  )
}

export default EventItem
