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
import { BifoldError, EventTypes, Screens, Stacks, useStore, useTheme } from '@hyperledger/aries-bifold-core'
import { BasicMessageMetadata, basicMessageCustomMetadata } from '@hyperledger/aries-bifold-core/App/types/metadata'
import { HomeStackParams } from '@hyperledger/aries-bifold-core/App/types/navigators'
import { CustomNotification, CustomNotificationRecord } from '@hyperledger/aries-bifold-core/App/types/notification'
import { formatTime, getConnectionName } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import { markProofAsViewed } from '@hyperledger/aries-bifold-verifier'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Image, StyleSheet } from 'react-native'

import CredentialAddedImg from '../assets/img/CredentialAdded.svg'
import FleurLysImg from '../assets/img/FleurLys.svg'
import MessageImg from '../assets/img/Message.svg'
import ProofRequestImg from '../assets/img/ProofRequest.svg'
import RevocationImg from '../assets/img/Revocation.svg'

import CustomCheckBox from './CustomCheckBox'
import EventItem from './EventItem'

export enum NotificationTypeEnum {
  BasicMessage = 'BasicMessage',
  CredentialOffer = 'Offer',
  ProofRequest = 'ProofRecord',
  Revocation = 'Revocation',
  Custom = 'Custom',
  Proof = 'Proof',
}

interface NotificationListItemProps {
  notificationType: NotificationTypeEnum
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
  selected?: boolean
  setSelected?: ({ id, deleteAction }: { id: string; deleteAction?: () => void }) => void
  activateSelection?: boolean
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
  selected,
  setSelected,
  activateSelection,
}) => {
  const navigation = useNavigation<StackNavigationProp<HomeStackParams>>()
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const { agent } = useAgent()
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

  const handleSwipeClose = () => {
    if (openSwipeableId === notification.id) {
      onOpenSwipeable(null) // Close the current swipeable
    }
  }

  const getConnectionImage = (connection: ConnectionRecord | undefined, notificationType: NotificationTypeEnum) => {
    if (connection?.imageUrl) return <Image source={{ uri: connection.imageUrl }} style={styles.icon} />
    const dimensions = { width: 24, height: 24 }
    switch (notificationType) {
      case NotificationTypeEnum.BasicMessage:
        return <MessageImg width={dimensions.width} height={dimensions.height} />
      case NotificationTypeEnum.CredentialOffer:
        return <CredentialAddedImg width={dimensions.width} height={dimensions.height} />
      case NotificationTypeEnum.ProofRequest:
      case NotificationTypeEnum.Proof:
        return <ProofRequestImg width={dimensions.width} height={dimensions.height} />
      case NotificationTypeEnum.Revocation:
        return <RevocationImg width={dimensions.width} height={dimensions.height} />
      default:
        return <FleurLysImg width={dimensions.width} height={dimensions.height} />
    }
  }

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
  }

  const dismissProofRequest = async () => {
    if (agent && notificationType === NotificationTypeEnum.ProofRequest) {
      markProofAsViewed(agent, notification as ProofExchangeRecord)
    }
  }

  const dismissBasicMessage = async () => {
    if (agent && notificationType === NotificationTypeEnum.BasicMessage) {
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
  }

  const declineCustomNotification = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customNotification?.onCloseAction(dispatch as any)
  }

  const removeNotification = () => {
    if (notificationType === NotificationTypeEnum.ProofRequest) {
      if ((notification as ProofExchangeRecord).state === ProofState.Done) {
        dismissProofRequest()
      } else {
        declineProofRequest()
      }
    } else if (notificationType === NotificationTypeEnum.CredentialOffer) {
      declineCredentialOffer()
    } else if (notificationType === NotificationTypeEnum.BasicMessage) {
      dismissBasicMessage()
    } else if (notificationType === NotificationTypeEnum.Custom) {
      declineCustomNotification()
    }
  }

  const detailsForNotificationType = async (notificationType: NotificationTypeEnum): Promise<DisplayDetails> => {
    return new Promise((resolve) => {
      const theirLabel = getConnectionName(connection, store.preferences.alternateContactNames)

      switch (notificationType) {
        case NotificationTypeEnum.BasicMessage:
          resolve({
            title: t('Home.NewMessage'),
            body: theirLabel ? `${theirLabel} ${t('Home.SentMessage')}` : t('Home.ReceivedMessage'),
            eventTime: connection?.createdAt
              ? formatTime(connection.createdAt, { shortMonth: true, includeHour: true })
              : '',
          })
          break
        case NotificationTypeEnum.CredentialOffer: {
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
        case NotificationTypeEnum.ProofRequest: {
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
        case NotificationTypeEnum.Revocation: {
          const credentialId = (notification as CredentialExchangeRecord).id
          agent?.credentials.findById(credentialId).then((cred) => {
            const revocationDate = cred?.revocationNotification?.revocationDate
            resolve({
              title: t('CredentialDetails.NewRevoked'),
              body: theirLabel,
              eventTime: revocationDate
                ? formatTime(new Date(revocationDate), { shortMonth: true, includeHour: true })
                : '',
            })
          })
          break
        }
        case NotificationTypeEnum.Custom:
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
    notificationType: NotificationTypeEnum
  ) => {
    switch (notificationType) {
      case NotificationTypeEnum.BasicMessage:
        navigation.getParent()?.navigate(Stacks.ContactStack, {
          screen: Screens.Chat,
          params: { connectionId: (notification as BasicMessageRecord).connectionId },
        })
        break
      case NotificationTypeEnum.CredentialOffer:
        navigation.getParent()?.navigate(Stacks.ConnectionStack, {
          screen: Screens.Connection,
          params: { credentialId: notification.id },
        })
        break
      case NotificationTypeEnum.ProofRequest:
        if (
          (notification as ProofExchangeRecord).state === ProofState.Done ||
          (notification as ProofExchangeRecord).state === ProofState.PresentationReceived
        ) {
          navigation.getParent()?.navigate(Stacks.ContactStack, {
            screen: Screens.ProofDetails,
            params: { recordId: notification.id, isHistory: true },
          })
        } else {
          navigation.getParent()?.navigate(Stacks.ConnectionStack, {
            screen: Screens.Connection,
            params: { proofId: (notification as ProofExchangeRecord).id },
          })
        }
        break
      case NotificationTypeEnum.Proof:
        navigation.getParent()?.navigate(Stacks.NotificationStack, {
          screen: Screens.ProofDetails,
          params: { recordId: notification.id, isHistory: true },
        })
        break
      case NotificationTypeEnum.Revocation:
        navigation.getParent()?.navigate(Stacks.NotificationStack, {
          screen: Screens.CredentialDetails,
          params: { credential: notification },
        })
        break
      case NotificationTypeEnum.Custom:
        navigation.getParent()?.navigate(Stacks.NotificationStack, {
          screen: Screens.CustomNotification,
        })
        break
      default:
        throw new Error('NotificationType was not set correctly.')
    }
  }

  const action = useCallback(() => {
    getActionForNotificationType(notification, notificationType)
  }, [notification, notificationType])

  useEffect(() => {
    const detailsPromise = async () => {
      const details = await detailsForNotificationType(notificationType)
      setDetails(details)
    }
    detailsPromise()
  }, [notificationType, t])

  const removeCurrentNotification = () => {
    removeNotification()
    handleSwipeClose()
  }

  return (
    <EventItem
      action={action}
      handleDelete={removeCurrentNotification}
      event={{
        id: notification.id,
        title: details.title,
        body: details.body,
        eventTime: details.eventTime,
        image: activateSelection ? (
          <CustomCheckBox selected={selected} setSelected={() => setSelected} />
        ) : (
          getConnectionImage(connection, notificationType)
        ),
      }}
      openSwipeableId={openSwipeableId}
      onOpenSwipeable={onOpenSwipeable}
      setSelected={setSelected}
      activateSelection={activateSelection}
    />
  )
}

export default NotificationListItem
