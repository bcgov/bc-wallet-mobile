import { ThemedText, testIdWithKey, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

export enum BCSCBanner {
  IAS_SERVER_UNAVAILABLE = 'IASServerUnavailableBanner',
  IAS_SERVER_NOTIFICATION = 'IASServerNotificationBanner',
  DEVICE_LIMIT_EXCEEDED = 'DeviceLimitExceededBanner',
  LIVE_CALL_STATUS = 'LiveCallStatusBanner',
  APP_UPDATE_AVAILABLE = 'AppUpdateAvailableBanner',
  ACCOUNT_EXPIRING_SOON = 'CardExpiringSoonBanner',
  ACCOUNT_EXPIRED = 'CardExpiredBanner',
}

export interface BCSCBannerMessage {
  id: BCSCBanner
  title: string
  description?: string
  onPress?: (id: string) => void
  type: 'error' | 'warning' | 'info' | 'success'
  dismissible?: boolean
}

export interface AppBannerSectionProps extends BCSCBannerMessage {
  onPress?: (id: string) => void
  description?: string
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
          description={message.description}
          type={message.type}
          onPress={message.onPress}
          dismissible={message.dismissible}
        />
      ))}
    </View>
  )
}

export const AppBannerSection: React.FC<AppBannerSectionProps> = ({
  id,
  title,
  type,
  onPress,
  description,
  dismissible = true,
}) => {
  const { Spacing, ColorPalette } = useTheme()
  const [showBanner, setShowBanner] = useState(true)

  const styles = StyleSheet.create({
    container: {
      backgroundColor: ColorPalette.brand.primary,
      flexDirection: 'row',
      padding: Spacing.md,
    },
    textContainer: {
      flex: 1,
      gap: Spacing.sm,
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

  if (!showBanner) {
    return null
  }

  // If more details are needed we might need to push the banner down to accommodate the extra information
  return (
    <TouchableOpacity
      style={[{ ...styles.container, backgroundColor: bannerColor(type) }]}
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
      <View style={styles.textContainer}>
        <ThemedText
          variant={'bold'}
          style={{
            color: type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white,
          }}
          testID={testIdWithKey(`text-${type}`)}
        >
          {title}
        </ThemedText>
        {description ? (
          <ThemedText
            style={{
              lineHeight: 24,
              color: type === 'warning' ? ColorPalette.brand.secondaryBackground : ColorPalette.grayscale.white,
            }}
            testID={testIdWithKey(`description-${type}`)}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}
