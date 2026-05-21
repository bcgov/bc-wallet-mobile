import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { formatTime, getConnectionName, Screens, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import {
  useBasicMessagesByConnectionId,
  useConnectionById,
  useCredentialsByConnectionId,
  useProofsByConnectionId,
} from '@bifold/react-hooks'
import { DidCommBasicMessageRecord, DidCommBasicMessageRole, DidCommCredentialState } from '@credo-ts/didcomm'
import { useHeaderHeight } from '@react-navigation/elements'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import {
  Actions,
  ActionsProps,
  Composer,
  ComposerProps,
  GiftedChat,
  IMessage,
  InputToolbar,
  InputToolbarProps,
  MessageProps,
  Send,
  SendProps,
} from 'react-native-gifted-chat'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import {
  credentialEventLabelKey,
  credentialEventRole,
  EventRole,
  messageEventRole,
  proofEventLabelKey,
  proofEventRole,
} from './services/chat-events'

interface ContactChatScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ContactChat>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ContactChat>
}

const ME_ID = 1
const THEM_ID = 2

type ChatItemKind = 'text' | 'connected' | 'credentialEvent' | 'proofEvent'

interface ChatItem extends IMessage {
  kind: ChatItemKind
  role: EventRole
  /** Localized label key for credential/proof event (e.g. 'Chat.CredentialOfferReceived'). */
  eventLabelKey?: string
  /** Optional handler for the "View request" action; when absent, no button is shown. */
  onView?: () => void
}

const userIdForRole = (role: EventRole): number => (role === 'me' ? ME_ID : THEM_ID)

const ContactChatScreen = ({ navigation, route }: ContactChatScreenProps) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const connection = useConnectionById(connectionId)
  const basicMessages: DidCommBasicMessageRecord[] = useBasicMessagesByConnectionId(connectionId)
  const credentials = useCredentialsByConnectionId(connectionId)
  const proofs = useProofsByConnectionId(connectionId)
  const headerHeight = useHeaderHeight()

  const theirLabel = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  useLayoutEffect(() => {
    navigation.setOptions({ title: theirLabel })
  }, [navigation, theirLabel])

  const items: ChatItem[] = useMemo(() => {
    const out: ChatItem[] = []

    for (const m of basicMessages) {
      out.push({
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
    }

    for (const c of credentials) {
      const labelKey = credentialEventLabelKey(c)
      if (!labelKey) {
        continue
      }
      const role = credentialEventRole(c)
      const onView =
        c.state === DidCommCredentialState.Done || c.state === DidCommCredentialState.CredentialReceived
          ? () => navigation.navigate(Screens.CredentialDetails, { credentialId: c.id })
          : undefined
      out.push({
        _id: c.id,
        text: t(labelKey as any),
        createdAt: new Date(c.createdAt),
        user: { _id: userIdForRole(role) },
        kind: 'credentialEvent',
        role,
        eventLabelKey: labelKey,
        onView,
      })
    }

    for (const p of proofs) {
      const labelKey = proofEventLabelKey(p)
      if (!labelKey) {
        continue
      }
      const role = proofEventRole(p)
      out.push({
        _id: p.id,
        text: t(labelKey as any),
        createdAt: new Date(p.createdAt),
        user: { _id: userIdForRole(role) },
        kind: 'proofEvent',
        role,
        eventLabelKey: labelKey,
      })
    }

    if (connection) {
      out.push({
        _id: `connected-${connection.id}`,
        text: t('Chat.YouConnected'),
        createdAt: new Date(connection.createdAt),
        user: { _id: ME_ID },
        kind: 'connected',
        role: 'me',
      })
    }

    // GiftedChat is inverted: newest first in the array (rendered nearest the composer).
    out.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime())
    return out
  }, [basicMessages, credentials, proofs, connection, theirLabel, t, navigation])

  const onSend = useCallback(
    async (sent: IMessage[]) => {
      if (!agent || !sent[0]?.text) {
        return
      }
      await agent.modules.didcomm.basicMessages.sendMessage(connectionId, sent[0].text)
    },
    [agent, connectionId]
  )

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: ColorPalette.brand.primaryBackground,
        },
        cardRow: {
          paddingHorizontal: Spacing.md,
          marginVertical: Spacing.xs,
        },
        card: {
          borderRadius: 8,
          padding: Spacing.md,
          maxWidth: '85%',
        },
        cardMe: {
          backgroundColor: ColorPalette.brand.primaryLight,
          alignSelf: 'flex-end',
        },
        cardThem: {
          backgroundColor: ColorPalette.brand.secondaryBackground,
          borderWidth: 1,
          borderColor: ColorPalette.grayscale.veryLightGrey,
          alignSelf: 'flex-start',
        },
        iconBox: {
          width: 40,
          height: 40,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#7FB3E0',
          marginBottom: Spacing.sm,
        },
        body: {
          color: ColorPalette.grayscale.darkGrey,
        },
        bold: {
          fontWeight: 'bold',
          color: ColorPalette.grayscale.darkGrey,
        },
        time: {
          color: ColorPalette.grayscale.mediumGrey,
          fontSize: 13,
          marginTop: Spacing.sm,
        },
        viewButton: {
          alignSelf: 'flex-start',
          backgroundColor: ColorPalette.brand.primary,
          borderRadius: 32,
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.sm,
          marginTop: Spacing.md,
        },
        viewButtonText: {
          color: ColorPalette.brand.text,
          fontWeight: 'bold',
        },
        textBubbleRow: {
          paddingHorizontal: Spacing.md,
          marginVertical: Spacing.xs,
        },
        textBubble: {
          maxWidth: '80%',
          borderRadius: 12,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
        },
        textBubbleMe: {
          backgroundColor: ColorPalette.brand.primary,
          alignSelf: 'flex-end',
        },
        textBubbleThem: {
          backgroundColor: ColorPalette.brand.secondaryBackground,
          borderWidth: 1,
          borderColor: ColorPalette.grayscale.veryLightGrey,
          alignSelf: 'flex-start',
        },
        textMessageMe: {
          color: ColorPalette.brand.text,
        },
        textMessageThem: {
          color: ColorPalette.grayscale.darkGrey,
        },
        textTimeMe: {
          color: ColorPalette.brand.text,
          opacity: 0.85,
          fontSize: 12,
          textAlign: 'right',
          marginTop: 2,
        },
        textTimeThem: {
          color: ColorPalette.grayscale.mediumGrey,
          fontSize: 12,
          textAlign: 'right',
          marginTop: 2,
        },
        // Input toolbar
        inputToolbar: {
          backgroundColor: ColorPalette.brand.secondaryBackground,
          borderTopWidth: 1,
          borderTopColor: ColorPalette.grayscale.veryLightGrey,
          paddingVertical: 4,
        },
        composer: {
          color: ColorPalette.grayscale.darkGrey,
          backgroundColor: 'transparent',
          paddingHorizontal: Spacing.sm,
        },
        sendContainer: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: Spacing.sm,
        },
        actionsContainer: {
          width: 32,
          height: 32,
          marginLeft: Spacing.md,
          marginBottom: 6,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [ColorPalette, Spacing]
  )

  const renderConnectedCard = useCallback(
    (item: ChatItem) => (
      <View key={String(item._id)} style={styles.cardRow}>
        <View style={[styles.card, styles.cardMe]}>
          <ThemedText style={styles.body}>
            {t('Chat.YouConnected')} <ThemedText style={styles.bold}>{theirLabel}</ThemedText>.
          </ThemedText>
          <ThemedText style={styles.time}>
            {formatTime(item.createdAt as Date, { chatFormat: true, trim: true })}
          </ThemedText>
        </View>
      </View>
    ),
    [styles, t, theirLabel]
  )

  const renderEventCard = useCallback(
    (item: ChatItem) => {
      const isMe = item.role === 'me'
      const youOrThem = isMe ? t('Chat.UserYou') : theirLabel
      const actionLabel = item.eventLabelKey ? t(item.eventLabelKey as any) : ''
      return (
        <View key={String(item._id)} style={styles.cardRow}>
          <View style={[styles.card, isMe ? styles.cardMe : styles.cardThem]}>
            <View style={styles.iconBox}>
              <Icon name="file-document-outline" size={22} color={ColorPalette.grayscale.white} />
            </View>
            <ThemedText style={styles.body}>
              {youOrThem} <ThemedText style={styles.bold}>{actionLabel}</ThemedText>
              {isMe ? '' : '.'}
            </ThemedText>
            <ThemedText style={styles.time}>
              {formatTime(item.createdAt as Date, { chatFormat: true, trim: true })}
            </ThemedText>
            {item.onView ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('Chat.ViewRequest')}
                testID={testIdWithKey('ViewRequest')}
                onPress={item.onView}
                style={styles.viewButton}
              >
                <ThemedText style={styles.viewButtonText}>{t('Chat.ViewRequest')}</ThemedText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )
    },
    [ColorPalette.grayscale.white, styles, t, theirLabel]
  )

  const renderTextBubble = useCallback(
    (item: ChatItem) => {
      const isMe = item.role === 'me'
      return (
        <View key={String(item._id)} style={styles.textBubbleRow}>
          <View style={[styles.textBubble, isMe ? styles.textBubbleMe : styles.textBubbleThem]}>
            <ThemedText style={isMe ? styles.textMessageMe : styles.textMessageThem}>{item.text}</ThemedText>
            <ThemedText numberOfLines={1} style={isMe ? styles.textTimeMe : styles.textTimeThem}>
              {formatTime(item.createdAt as Date, { chatFormat: true, trim: true })}
            </ThemedText>
          </View>
        </View>
      )
    },
    [styles]
  )

  const renderMessage = useCallback(
    (props: MessageProps<ChatItem>) => {
      const item = props.currentMessage
      if (!item) {
        return <View />
      }
      switch (item.kind) {
        case 'connected':
          return renderConnectedCard(item)
        case 'credentialEvent':
        case 'proofEvent':
          return renderEventCard(item)
        case 'text':
        default:
          return renderTextBubble(item)
      }
    },
    [renderConnectedCard, renderEventCard, renderTextBubble]
  )

  const renderInputToolbar = useCallback(
    (props: InputToolbarProps<IMessage>) => <InputToolbar {...props} containerStyle={styles.inputToolbar} />,
    [styles.inputToolbar]
  )

  const renderComposer = useCallback(
    (props: ComposerProps) => (
      <Composer
        {...props}
        textInputProps={{
          ...props.textInputProps,
          accessibilityLabel: '',
          maxFontSizeMultiplier: 1.2,
          editable: !!agent,
          placeholder: t('BCSC.Contacts.Chat.Placeholder'),
          placeholderTextColor: ColorPalette.grayscale.mediumGrey,
          style: styles.composer,
        }}
      />
    ),
    [agent, ColorPalette.grayscale.mediumGrey, styles.composer, t]
  )

  const renderSend = useCallback(
    (props: SendProps<IMessage>) => (
      <Send {...props} isSendButtonAlwaysVisible containerStyle={styles.sendContainer}>
        <Icon
          name="send"
          size={28}
          color={props.text ? ColorPalette.brand.primary : ColorPalette.grayscale.lightGrey}
        />
      </Send>
    ),
    [ColorPalette.brand.primary, ColorPalette.grayscale.lightGrey, styles.sendContainer]
  )

  const renderActions = useCallback(
    (props: ActionsProps) => (
      <Actions
        {...props}
        wrapperStyle={styles.actionsContainer}
        icon={() => (
          <Icon
            name="plus-box-outline"
            size={28}
            color={ColorPalette.brand.primary}
            accessibilityLabel={t('Chat.Actions')}
            accessibilityRole="button"
          />
        )}
      />
    ),
    [ColorPalette.brand.primary, styles.actionsContainer, t]
  )

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.screen}>
      <GiftedChat
        messages={items}
        renderAvatar={null}
        renderMessage={renderMessage}
        renderInputToolbar={renderInputToolbar}
        renderComposer={renderComposer}
        renderSend={renderSend}
        renderActions={renderActions}
        onSend={onSend}
        user={{ _id: ME_ID }}
        // GiftedChat wraps the chat in a `react-native-keyboard-controller`
        // KeyboardAvoidingView already; its default offset is only `insets.top`
        // (status bar), which leaves the composer hidden under the keyboard on
        // Android because the navigation header isn't accounted for. Override
        // with the navigator-aware header height. Wrapping the screen in our
        // own RN KeyboardAvoidingView duplicated the work and was a no-op on
        // Android (behavior=undefined), so it's removed.
        keyboardAvoidingViewProps={{ keyboardVerticalOffset: headerHeight }}
      />
    </SafeAreaView>
  )
}

export default ContactChatScreen
