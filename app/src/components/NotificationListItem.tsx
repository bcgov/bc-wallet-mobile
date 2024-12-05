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
import { BifoldError, EventTypes, Screens, Stacks, useStore } from '@hyperledger/aries-bifold-core'
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
import { BCDispatchAction, BCState } from '../store'

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
  setSelected?: ({ id, deleteAction }: { id: string; deleteAction?: () => Promise<void> }) => void
  activateSelection?: boolean
  isHome?: boolean
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
  isHome = true,
}) => {
  const navigation = useNavigation<StackNavigationProp<HomeStackParams>>()
  const [store, dispatch] = useStore<BCState>()
  const storeNofication = store.activities[notification.id]
  const { t } = useTranslation()
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
    icon: {
      width: 24,
      height: 24,
    },
  })

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
      await markProofAsViewed(agent, notification as ProofExchangeRecord)
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

  const removeNotification = useCallback(async () => {
    if (
      notificationType === NotificationTypeEnum.ProofRequest &&
      (notification as ProofExchangeRecord).state !== ProofState.Declined
    ) {
      if ((notification as ProofExchangeRecord).state === ProofState.Done) {
        await dismissProofRequest()
      } else {
        await declineProofRequest()
      }
    } else if (notificationType === NotificationTypeEnum.CredentialOffer) {
      await declineCredentialOffer()
    } else if (notificationType === NotificationTypeEnum.BasicMessage) {
      await dismissBasicMessage()
    } else if (notificationType === NotificationTypeEnum.Custom) {
      await declineCustomNotification()
    }
  }, [notificationType, notification])

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
    dispatch({
      type: BCDispatchAction.NOTIFICATIONS_UPDATED,
      payload: [
        {
          [notification.id]: {
            isRead: true,
            isTempDeleted: false,
          },
        },
      ],
    })
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

  const removeCurrentNotification = async () => {
    await removeNotification()
  }

  return (
    <EventItem
      action={action}
      isRead={!!storeNofication?.isRead}
      isHome={isHome}
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
