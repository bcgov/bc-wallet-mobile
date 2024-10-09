import {
  Agent,
  BasicMessageRecord,
  BasicMessageRepository,
  ConnectionRecord,
  CredentialExchangeRecord,
  ProofExchangeRecord,
  ProofState,
  SdJwtVcRecord,
  W3cCredentialRecord,
} from '@credo-ts/core'
import { useAgent, useConnectionById } from '@credo-ts/react-hooks'
import {
  BifoldError,
  EventTypes,
  GenericFn,
  Screens,
  Stacks,
  testIdWithKey,
  useStore,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import CommonRemoveModal from '@hyperledger/aries-bifold-core/App/components/modals/CommonRemoveModal'
import { BasicMessageMetadata, basicMessageCustomMetadata } from '@hyperledger/aries-bifold-core/App/types/metadata'
import { HomeStackParams } from '@hyperledger/aries-bifold-core/App/types/navigators'
import { CustomNotification, CustomNotificationRecord } from '@hyperledger/aries-bifold-core/App/types/notification'
import { ModalUsage } from '@hyperledger/aries-bifold-core/App/types/remove'
import { formatTime, getConnectionName } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { markProofAsViewed } from '@hyperledger/aries-bifold-verifier'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import MaterialIcon from 'react-native-vector-icons/MaterialIcons'

import CredentialAddedImg from '../assets/img/CredentialAdded.svg'
import FleurLysImg from '../assets/img/FleurLys.svg'
import MessageImg from '../assets/img/Message.svg'
import ProofRequestImg from '../assets/img/ProofRequest.svg'
import RevocationImg from '../assets/img/Revocation.svg'
import { hitSlop } from '../constants'

const iconSize = 20

export enum NotificationType {
  BasicMessage = 'BasicMessage',
  CredentialOffer = 'Offer',
  ProofRequest = 'ProofRecord',
  Revocation = 'Revocation',
  Custom = 'Custom',
  Proof = 'Proof',
}

interface NotificationListItemProps {
  notificationType: NotificationType
  notification:
    | BasicMessageRecord
    | CredentialExchangeRecord
    | ProofExchangeRecord
    | CustomNotificationRecord
    | SdJwtVcRecord
    | W3cCredentialRecord
  customNotification?: CustomNotification
  openSwipeableId: string | null
  onOpenSwipeable: (id: string | null) => void
}

type DisplayDetails = {
  body: string | undefined
  title: string | undefined
  eventTime: string | undefined
}

const markMessageAsSeen = async (agent: Agent, record: BasicMessageRecord) => {
  const meta = record.metadata.get(BasicMessageMetadata.customMetadata) as basicMessageCustomMetadata
  record.metadata.set(BasicMessageMetadata.customMetadata, { ...meta, seen: true })
  const basicMessageRepository = agent.context.dependencyManager.resolve(BasicMessageRepository)
  await basicMessageRepository.update(agent.context, record)
}

const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notificationType,
  notification,
  customNotification,
  openSwipeableId,
  onOpenSwipeable,
}) => {
  const navigation = useNavigation<StackNavigationProp<HomeStackParams>>()
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const { agent } = useAgent()
  const [declineModalVisible, setDeclineModalVisible] = useState(false)
  const [action, setAction] = useState<GenericFn>()
  const [closeAction, setCloseAction] = useState<() => void>()
  const isNotCustomNotification =
    notification instanceof BasicMessageRecord ||
    notification instanceof CredentialExchangeRecord ||
    notification instanceof ProofExchangeRecord
  const connectionId = isNotCustomNotification ? notification.connectionId ?? '' : ''
  const connection = useConnectionById(connectionId)
  const [details, setDetails] = useState<DisplayDetails>({
    title: undefined,
    body: undefined,
    eventTime: undefined,
  })

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.grayscale.white,
      zIndex: 9999,
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

  // Close the swipeable if it is not the currently open one
  useEffect(() => {
    if (openSwipeableId !== notification.id && swipeableRef.current) {
      swipeableRef.current.close()
    }
  }, [openSwipeableId])

  const handleSwipeClose = () => {
    if (openSwipeableId === notification.id) {
      onOpenSwipeable(null) // Close the current swipeable
    }
  }

  const handleSwipeOpen = () => {
    onOpenSwipeable(notification.id) // Call the parent function to notify which item is opened
  }

  const getConnectionImage = (connection: ConnectionRecord | undefined, notificationType: NotificationType) => {
    if (connection?.imageUrl) return <Image source={{ uri: connection.imageUrl }} style={styles.icon} />
    const dimensions = { width: 24, height: 24 }
    switch (notificationType) {
      case NotificationType.BasicMessage:
        return <MessageImg width={dimensions.width} height={dimensions.height} />
      case NotificationType.CredentialOffer:
        return <CredentialAddedImg width={dimensions.width} height={dimensions.height} />
      case NotificationType.ProofRequest:
      case NotificationType.Proof:
        return <ProofRequestImg width={dimensions.width} height={dimensions.height} />
      case NotificationType.Revocation:
        return <RevocationImg width={dimensions.width} height={dimensions.height} />
      default:
        return <FleurLysImg width={dimensions.width} height={dimensions.height} />
    }
  }

  const toggleDeclineModalVisible = () => setDeclineModalVisible(!declineModalVisible)

  const declineProofRequest = async () => {
    try {
      const proofId = (notification as ProofExchangeRecord).id
      if (agent) {
        await agent.proofs.declineRequest({ proofRecordId: proofId })
      }
    } catch (err: unknown) {
      const error = new BifoldError(t('Error.Title1028'), t('Error.Message1028'), (err as Error)?.message ?? err, 1028)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }

    toggleDeclineModalVisible()
  }

  const dismissProofRequest = async () => {
    if (agent && notificationType === NotificationType.ProofRequest) {
      markProofAsViewed(agent, notification as ProofExchangeRecord)
    }
  }

  const dismissBasicMessage = async () => {
    if (agent && notificationType === NotificationType.BasicMessage) {
      markMessageAsSeen(agent, notification as BasicMessageRecord)
    }
  }

  const declineCredentialOffer = async () => {
    try {
      const credentialId = (notification as CredentialExchangeRecord).id
      if (agent) {
        await agent.credentials.declineOffer(credentialId)
      }
    } catch (err: unknown) {
      const error = new BifoldError(t('Error.Title1028'), t('Error.Message1028'), (err as Error)?.message ?? err, 1028)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }

    toggleDeclineModalVisible()
  }

  const declineCustomNotification = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customNotification?.onCloseAction(dispatch as any)
    toggleDeclineModalVisible()
  }

  const commonRemoveModal = () => {
    let usage: ModalUsage | undefined
    let onSubmit: GenericFn | undefined

    if (notificationType === NotificationType.ProofRequest) {
      usage = ModalUsage.ProofRequestDecline
      if ((notification as ProofExchangeRecord).state === ProofState.Done) {
        onSubmit = dismissProofRequest
      } else {
        onSubmit = declineProofRequest
      }
    } else if (notificationType === NotificationType.CredentialOffer) {
      usage = ModalUsage.CredentialOfferDecline
      onSubmit = declineCredentialOffer
    } else if (notificationType === NotificationType.Custom) {
      usage = ModalUsage.CustomNotificationDecline
      onSubmit = declineCustomNotification
    } else {
      usage = undefined
    }

    return usage !== undefined && onSubmit !== undefined ? (
      <CommonRemoveModal
        usage={usage}
        visible={declineModalVisible}
        onSubmit={onSubmit}
        onCancel={toggleDeclineModalVisible}
      />
    ) : null
  }

  const detailsForNotificationType = async (notificationType: NotificationType): Promise<DisplayDetails> => {
    return new Promise((resolve) => {
      const theirLabel = getConnectionName(connection, store.preferences.alternateContactNames)

      switch (notificationType) {
        case NotificationType.BasicMessage:
          resolve({
            title: t('Home.NewMessage'),
            body: theirLabel ? `${theirLabel} ${t('Home.SentMessage')}` : t('Home.ReceivedMessage'),
            eventTime: connection?.createdAt
              ? formatTime(connection.createdAt, { shortMonth: true, includeHour: true })
              : '',
          })
          break
        case NotificationType.CredentialOffer: {
          const credentialId = (notification as CredentialExchangeRecord).id
          agent?.credentials.findById(credentialId).then((cred) => {
            resolve({
              title: t('CredentialOffer.NewCredentialOffer'),
              body: theirLabel,
              eventTime: cred?.createdAt ? formatTime(cred.createdAt, { shortMonth: true, includeHour: true }) : '',
            })
          })
          break
        }
        case NotificationType.ProofRequest: {
          const proofId = (notification as ProofExchangeRecord).id
          agent?.proofs.findById(proofId).then((proof) => {
            resolve({
              title: t('ProofRequest.NewProofRequest'),
              body: theirLabel,
              eventTime: proof?.createdAt ? formatTime(proof.createdAt, { shortMonth: true, includeHour: true }) : '',
            })
          })
          break
        }
        case NotificationType.Revocation: {
          const credentialId = (notification as CredentialExchangeRecord).id
          agent?.credentials.findById(credentialId).then((cred) => {
            const revocationDate = cred?.revocationNotification?.revocationDate
            resolve({
              title: t('CredentialDetails.NewRevoked'),
              body: theirLabel,
              eventTime: revocationDate ? formatTime(revocationDate, { shortMonth: true, includeHour: true }) : '',
            })
          })
          break
        }
        case NotificationType.Custom:
          resolve({
            title: t(customNotification?.title as string),
            body: t(customNotification?.description as string),
            eventTime: formatTime(notification.createdAt, { shortMonth: true, includeHour: true }),
          })
          break
        default:
          throw new Error('NotificationType was not set correctly.')
      }
    })
  }

  const getActionForNotificationType = (
    notification:
      | BasicMessageRecord
      | CredentialExchangeRecord
      | ProofExchangeRecord
      | CustomNotificationRecord
      | SdJwtVcRecord
      | W3cCredentialRecord,
    notificationType: NotificationType
  ) => {
    let onPress
    let onClose
    switch (notificationType) {
      case NotificationType.BasicMessage:
        onPress = () => {
          navigation.getParent()?.navigate(Stacks.ContactStack, {
            screen: Screens.Chat,
            params: { connectionId: (notification as BasicMessageRecord).connectionId },
          })
        }
        onClose = dismissBasicMessage
        break
      case NotificationType.CredentialOffer:
        onPress = () => {
          navigation.getParent()?.navigate(Stacks.NotificationStack, {
            screen: Screens.CredentialOffer,
            params: { credentialId: notification.id },
          })
        }
        onClose = toggleDeclineModalVisible
        break
      case NotificationType.ProofRequest:
        if (
          (notification as ProofExchangeRecord).state === ProofState.Done ||
          (notification as ProofExchangeRecord).state === ProofState.PresentationReceived
        ) {
          onPress = () => {
            navigation.getParent()?.navigate(Stacks.ContactStack, {
              screen: Screens.ProofDetails,
              params: { recordId: notification.id, isHistory: true },
            })
          }
        } else {
          onPress = () => {
            navigation.getParent()?.navigate(Stacks.NotificationStack, {
              screen: Screens.ProofRequest,
              params: { proofId: (notification as ProofExchangeRecord).id },
            })
          }
        }
        onClose = toggleDeclineModalVisible
        break
      case NotificationType.Proof:
        onPress = () =>
          navigation.getParent()?.navigate(Stacks.NotificationStack, {
            screen: Screens.ProofDetails,
            params: { recordId: notification.id, isHistory: true },
          })
        break
      case NotificationType.Revocation:
        onPress = () =>
          navigation.getParent()?.navigate(Stacks.NotificationStack, {
            screen: Screens.CredentialDetails,
            params: { credential: notification },
          })
        break
      case NotificationType.Custom:
        onPress = () =>
          navigation.getParent()?.navigate(Stacks.NotificationStack, {
            screen: Screens.CustomNotification,
          })
        onClose = toggleDeclineModalVisible
        break
      default:
        throw new Error('NotificationType was not set correctly.')
    }
    return { onPress, onClose }
  }

  useEffect(() => {
    const { onPress, onClose } = getActionForNotificationType(notification, notificationType)
    setAction(() => onPress)
    setCloseAction(() => onClose)
  }, [notification])

  useEffect(() => {
    const detailsPromise = async () => {
      const details = await detailsForNotificationType(notificationType)
      setDetails(details)
    }
    detailsPromise()
  }, [notificationType, t])

  const isReceivedProof =
    notificationType === NotificationType.ProofRequest &&
    ((notification as ProofExchangeRecord).state === ProofState.Done ||
      (notification as ProofExchangeRecord).state === ProofState.PresentationSent)
  const includesNotificationType = [
    NotificationType.BasicMessage,
    NotificationType.Custom,
    NotificationType.ProofRequest,
    NotificationType.CredentialOffer,
  ].includes(notificationType)

  const body = (
    <Pressable
      accessibilityLabel={t('Global.View')}
      accessibilityRole={'button'}
      testID={testIdWithKey(`View${notificationType}${isReceivedProof ? 'Received' : ''}`)}
      onPress={action}
      hitSlop={hitSlop}
    >
      <View style={[styles.container]} testID={testIdWithKey('NotificationListItem')}>
        {getConnectionImage(connection, notificationType)}
        <View style={styles.infoContainer}>
          <Text style={[styles.headerText]} testID={testIdWithKey('HeaderText')}>
            {details.title}
          </Text>
          <Text style={[styles.bodyText]} testID={testIdWithKey('BodyText')}>
            {details.body}
          </Text>
          <Text style={styles.bodyEventTime} testID={testIdWithKey('BodyEventTime')}>
            {details.eventTime}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <MaterialIcon name={'keyboard-arrow-right'} size={iconSize} />
        </View>
        {commonRemoveModal()}
      </View>
    </Pressable>
  )

  const handleDelete = () => {
    closeAction?.()
    handleSwipeClose()
  }

  const rightSwipeAction = () => {
    return (
      <TouchableOpacity onPress={handleDelete}>
        <View style={styles.rightAction}>
          <MaterialCommunityIcon name={'trash-can-outline'} size={20} style={styles.rightActionIcon} />
          <Text style={styles.rightActionText}>{t('Notifications.Dismiss')}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return includesNotificationType ? (
    <Swipeable
      ref={swipeableRef}
      onSwipeableWillOpen={handleSwipeOpen}
      onSwipeableClose={handleSwipeClose}
      renderRightActions={rightSwipeAction}
    >
      {body}
    </Swipeable>
  ) : (
    body
  )
}

export default NotificationListItem
