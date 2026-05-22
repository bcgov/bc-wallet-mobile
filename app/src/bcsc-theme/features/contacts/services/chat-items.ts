import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Screens } from '@bifold/core'
import {
  DidCommBasicMessageRecord,
  DidCommBasicMessageRole,
  DidCommConnectionRecord,
  DidCommCredentialExchangeRecord,
  DidCommCredentialState,
  DidCommProofExchangeRecord,
} from '@credo-ts/didcomm'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { IMessage } from 'react-native-gifted-chat'

import {
  credentialEventLabelKey,
  credentialEventRole,
  EventRole,
  messageEventRole,
  proofEventLabelKey,
  proofEventRole,
} from './chat-events'

export const ME_ID = 1
export const THEM_ID = 2

export type ChatItemKind = 'text' | 'connected' | 'credentialEvent' | 'proofEvent'

export interface ChatItem extends IMessage {
  kind: ChatItemKind
  role: EventRole
  /** Localized label key for credential/proof event (e.g. 'Chat.CredentialOfferReceived'). */
  eventLabelKey?: string
  /** Optional handler for the "View request" action; when absent, no button is shown. */
  onView?: () => void
}

type TFn = ReturnType<typeof useTranslation>['t']
export type ChatNavigation = StackNavigationProp<BCSCMainStackParams, BCSCScreens.ContactChat>

const userIdForRole = (role: EventRole): number => (role === 'me' ? ME_ID : THEM_ID)

export const messageToChatItem = (m: DidCommBasicMessageRecord, theirLabel: string): ChatItem => ({
  _id: m.id,
  text: m.content,
  createdAt: new Date(m.sentTime ?? m.createdAt),
  user: {
    _id: m.role === DidCommBasicMessageRole.Sender ? ME_ID : THEM_ID,
    name: m.role === DidCommBasicMessageRole.Sender ? undefined : theirLabel,
  },
  kind: 'text',
  role: messageEventRole(m),
})

export const credentialToChatItem = (
  c: DidCommCredentialExchangeRecord,
  t: TFn,
  navigation: ChatNavigation
): ChatItem | null => {
  const labelKey = credentialEventLabelKey(c)
  if (!labelKey) {
    return null
  }
  const role = credentialEventRole(c)
  const canView = c.state === DidCommCredentialState.Done || c.state === DidCommCredentialState.CredentialReceived
  return {
    _id: c.id,
    text: t(labelKey as any),
    createdAt: new Date(c.createdAt),
    user: { _id: userIdForRole(role) },
    kind: 'credentialEvent',
    role,
    eventLabelKey: labelKey,
    onView: canView ? () => navigation.navigate(Screens.CredentialDetails, { credentialId: c.id }) : undefined,
  }
}

export const proofToChatItem = (p: DidCommProofExchangeRecord, t: TFn): ChatItem | null => {
  const labelKey = proofEventLabelKey(p)
  if (!labelKey) {
    return null
  }
  const role = proofEventRole(p)
  return {
    _id: p.id,
    text: t(labelKey as any),
    createdAt: new Date(p.createdAt),
    user: { _id: userIdForRole(role) },
    kind: 'proofEvent',
    role,
    eventLabelKey: labelKey,
  }
}

export const connectionToChatItem = (connection: DidCommConnectionRecord, t: TFn): ChatItem => ({
  _id: `connected-${connection.id}`,
  text: t('Chat.YouConnected'),
  createdAt: new Date(connection.createdAt),
  user: { _id: ME_ID },
  kind: 'connected',
  role: 'me',
})
