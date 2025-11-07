import { ThemedText, testIdWithKey, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

export enum BCSCBanner {
  IAS_SERVER_UNAVAILABLE = 'IASServerUnavailableBanner',
  IAS_SERVER_NOTIFICATION = 'IASServerNotificationBanner',
  DEVICE_LIMIT_EXCEEDED = 'DeviceLimitExceededBanner',
  LIVE_CALL_STATUS = 'LiveCallStatusBanner',
  CARD_EXPIRING_SOON = 'CardExpiringSoonBanner',
}

export interface BCSCBannerMessage {
  id: BCSCBanner
  title: string
  type: 'error' | 'warning' | 'info' | 'success'
  dismissible?: boolean
}

export interface AppBannerSectionProps extends BCSCBannerMessage {
  onPress?: (id: string) => void
}

interface AppBannerProps {
  messages: AppBannerSectionProps[]
}

export const AppBanner: React.FC<AppBannerProps> = ({ messages }: AppBannerProps) => {
  if (!messages || messages.length == 0) {
    return null
  }

  return (
    <View>
      {messages.map((message) => (
        <AppBannerSection
          key={message.id}
          id={message.id}
          title={message.title}
          type={message.type}
          onPress={message.onPress}
          dismissible={message.dismissible}
        />
      ))}
    </View>
  )
}

export const AppBannerSection: React.FC<AppBannerSectionProps> = ({ id, title, type, onPress, dismissible = true }) => {
  const { Spacing, ColorPalette } = useTheme()
  const [showBanner, setShowBanner] = useState(true)

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primary,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      padding: Spacing.md,
      flexShrink: 1,
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
      style={[{ ...styles.container, backgroundColor: bannerColor(type) }, !showBanner && { display: 'none' }]}
      testID={testIdWithKey(`button-${type}`)}
      onPress={() => {
        if (dismissible) {
          setShowBanner(false)
        }
        onPress?.(id)
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
        style={{
          flex: 1,
          color: type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white,
        }}
        testID={testIdWithKey(`text-${type}`)}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  )
}
