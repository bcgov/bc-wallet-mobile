import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme, ThemedText } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { uuid } from '@credo-ts/core/build/utils/uuid'
export interface AppBannerSectionProps {
  title: string
  type: 'error' | 'warning' | 'info' | 'success'
  details?: string
  dismissible?: boolean
  onDismiss?: () => void
}

interface AppBannerProps {
  messages: AppBannerSectionProps[]
}

export const AppBanner: React.FC<AppBannerProps> = ({ messages }) => {
  const [bannerMessages, setBannerMessages] = useState(messages)

  const dismissBanner = (index: number) => {
    setBannerMessages((prevMessages) => prevMessages.filter((_, i) => i !== index))
  }

  useEffect(() => {
    setBannerMessages(messages)
  }, [messages])

  if (!bannerMessages || bannerMessages.length == 0) {
    return null
  }

  return (
    <View>
      {bannerMessages.map((message, index) => (
        <AppBannerSection
          title={message.title}
          type={message.type}
          onDismiss={() => dismissBanner(index)}
          key={uuid()}
          dismissible={message.dismissible}
        />
      ))}
    </View>
  )
}

export const AppBannerSection: React.FC<AppBannerSectionProps> = ({ title, type, onDismiss, dismissible = true }) => {
  const { Spacing, ColorPallet } = useTheme()
  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primary,
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
    },
    icon: {
      marginRight: Spacing.md,
    },
  })

  const iconName = (type: string): string => {
    switch (type) {
      case 'error':
        return 'alert-circle'
      case 'warning':
        return 'alert'
      case 'info':
        return 'information'
      case 'success':
        return 'check-circle'
      default:
        return 'information'
    }
  }

  const bannerColor = (type: string): string => {
    switch (type) {
      case 'error':
        return '#CE3E39'
      case 'warning':
        return '#F8BB47'
      case 'info':
        return '#2E5DD7'
      case 'success':
        return '#42814A'
      default:
        return '#2E5DD7'
    }
  }

  // If more details are needed we might need to push the banner down to accommodate the extra information
  return (
    <TouchableOpacity
      style={{ ...styles.container, backgroundColor: bannerColor(type) }}
      onPress={() => {
        if (dismissible && onDismiss) {
          onDismiss()
        }
      }}
    >
      <Icon
        name={iconName(type)}
        size={24}
        color={type === 'warning' ? ColorPallet.brand.secondaryBackground : ColorPallet.grayscale.white}
        style={styles.icon}
      />
      <ThemedText
        variant={'bold'}
        style={{ color: type === 'warning' ? ColorPallet.brand.secondaryBackground : ColorPallet.grayscale.white }}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  )
}
