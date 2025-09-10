import { ThemedText, testIdWithKey, useTheme } from '@bifold/core'
import React, { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
export interface AppBannerSectionProps {
  title: string
  type: 'error' | 'warning' | 'info' | 'success'
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
          key={`${message.title}-${message.type}`}
          dismissible={message.dismissible}
        />
      ))}
    </View>
  )
}

export const AppBannerSection: React.FC<AppBannerSectionProps> = ({ title, type, onDismiss, dismissible = true }) => {
  const { Spacing, ColorPalette } = useTheme()
  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primary,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
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
      testID={testIdWithKey(`button-${type}`)}
      onPress={() => {
        if (dismissible && onDismiss) {
          onDismiss()
        }
      }}
    >
      <Icon
        name={iconName(type)}
        size={24}
        color={type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white}
        style={styles.icon}
        testID={testIdWithKey(`icon-${type}`)}
      />
      <ThemedText
        variant={'bold'}
        style={{ color: type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white }}
        testID={testIdWithKey(`text-${type}`)}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  )
}
