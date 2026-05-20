import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ButtonLocation, IconButton, getConnectionName, testIdWithKey, useStore, useTheme } from '@bifold/core'
import { useBasicMessagesByConnectionId, useConnectionById } from '@bifold/react-hooks'
import { DidCommBasicMessageRecord, DidCommBasicMessageRole } from '@credo-ts/didcomm'
import { useHeaderHeight } from '@react-navigation/elements'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { GiftedChat, IMessage } from 'react-native-gifted-chat'
import { SafeAreaView } from 'react-native-safe-area-context'

interface ContactChatScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ContactChat>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ContactChat>
}

const ME_ID = 1
const THEM_ID = 2

interface ChatHeaderInfoButtonProps {
  accessibilityLabel: string
  onPress: () => void
}

const ChatHeaderInfoButton: React.FC<ChatHeaderInfoButtonProps> = ({ accessibilityLabel, onPress }) => (
  <IconButton
    buttonLocation={ButtonLocation.Right}
    icon="information-outline"
    accessibilityLabel={accessibilityLabel}
    testID={testIdWithKey('ContactInfo')}
    onPress={onPress}
  />
)

// Factory so the header-right render component is defined at module scope
// rather than nested inside ContactChatScreen — matches the
// createVerifyHelpHeaderButton pattern in components/HelpHeaderButton.tsx.
const createChatHeaderRight = (props: ChatHeaderInfoButtonProps) => {
  const ChatHeaderRight = () => <ChatHeaderInfoButton {...props} />
  return ChatHeaderRight
}

const ContactChatScreen = ({ navigation, route }: ContactChatScreenProps) => {
  const { connectionId } = route.params
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()
  const { agent } = useBCSCAgent()
  const [store] = useStore()
  const connection = useConnectionById(connectionId)
  const basicMessages: DidCommBasicMessageRecord[] = useBasicMessagesByConnectionId(connectionId)
  const headerHeight = useHeaderHeight()

  const theirLabel = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  const onInfoPress = useCallback(
    () => navigation.navigate(BCSCScreens.ContactDetails, { connectionId }),
    [navigation, connectionId]
  )

  const HeaderRight = useMemo(
    () =>
      createChatHeaderRight({
        accessibilityLabel: t('BCSC.Contacts.Chat.InfoAccessibilityLabel'),
        onPress: onInfoPress,
      }),
    [t, onInfoPress]
  )

  useLayoutEffect(() => {
    navigation.setOptions({
      title: theirLabel,
      headerRight: HeaderRight,
    })
  }, [navigation, theirLabel, HeaderRight])

  const messages: IMessage[] = useMemo(() => {
    return basicMessages
      .map((msg) => ({
        _id: msg.id,
        text: msg.content,
        createdAt: new Date(msg.sentTime ?? msg.createdAt),
        user: {
          _id: msg.role === DidCommBasicMessageRole.Sender ? ME_ID : THEM_ID,
          name: msg.role === DidCommBasicMessageRole.Sender ? undefined : theirLabel,
        },
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [basicMessages, theirLabel])

  const onSend = useCallback(
    async (sent: IMessage[]) => {
      if (!agent || !sent[0]?.text) {
        return
      }
      await agent.modules.didcomm.basicMessages.sendMessage(connectionId, sent[0].text)
    },
    [agent, connectionId]
  )

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: ColorPalette.brand.primaryBackground }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <GiftedChat
          messages={messages}
          renderAvatar={null}
          textInputProps={{ placeholder: t('BCSC.Contacts.Chat.Placeholder'), editable: !!agent }}
          onSend={onSend}
          user={{ _id: ME_ID }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default ContactChatScreen
