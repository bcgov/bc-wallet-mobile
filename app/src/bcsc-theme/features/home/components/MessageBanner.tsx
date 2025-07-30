import { useTheme, ThemedText } from '@bifold/core'
import React from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface Message {
  msg: string
  type: string
}

interface MessageBannerProps {
  messages: Message[]
  handlePress?: () => void
}

const MessageBanner: React.FC<MessageBannerProps> = ({ messages, handlePress }) => {
  const { Spacing, ColorPalette } = useTheme()

  if (!messages || messages.length <= 0) {
    return null
  }

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primary,
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
    },
    icon: {
      marginRight: Spacing.md,
    },
  })

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Icon name="information" size={24} color={ColorPalette.brand.secondaryBackground} style={styles.icon} />
      <ThemedText variant={'bold'} style={{ color: ColorPalette.brand.secondaryBackground }}>
        {messages.length} new {messages.length === 1 ? 'message' : 'messages'}
      </ThemedText>
    </TouchableOpacity>
  )
}

export default MessageBanner
