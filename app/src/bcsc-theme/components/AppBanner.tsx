import { TestIds } from '@/test-ids/registry'
import { BannerColors, BannerType } from '@bcwallet-theme/theme'
import { ThemedText, testIdWithKey, useTheme } from '@bifold/core'
import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { a11yLabel } from '@utils/accessibility'

export enum BCSCBanner {
  IAS_SERVER_UNAVAILABLE = 'IASServerUnavailableBanner',
  IAS_SERVER_NOTIFICATION = 'IASServerNotificationBanner',
  DEVICE_LIMIT_EXCEEDED = 'DeviceLimitExceededBanner',
  LIVE_CALL_STATUS = 'LiveCallStatusBanner',
  APP_UPDATE_AVAILABLE = 'AppUpdateAvailableBanner',
  ACCOUNT_EXPIRED = 'CardExpiredBanner',
}

export interface BCSCBannerMessage {
  id: BCSCBanner
  title: string | undefined
  description?: string
  type: BannerType
  dismissible?: boolean
  metadata?: Record<string, unknown>
}

export interface AppBannerSectionProps extends BCSCBannerMessage {
  onPress?: (id: string) => void
  description?: string
}

interface AppBannerProps {
  messages: AppBannerSectionProps[]
}

// Order multiple banners by severity
const BANNER_SEVERITY_ORDER: BannerType[] = ['error', 'warning', 'info', 'success']

export const AppBanner: React.FC<AppBannerProps> = ({ messages }: AppBannerProps) => {
  if (!messages || messages.length == 0) {
    return null
  }

  const ordered = BANNER_SEVERITY_ORDER.flatMap((type) => messages.filter((message) => message.type === type))

  return (
    <View>
      {ordered.map((message) => (
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
  const { Spacing } = useTheme()
  const [showBanner, setShowBanner] = useState(true)
  const { background, foreground } = BannerColors[type]

  const styles = StyleSheet.create({
    container: {
      backgroundColor: background,
      flexDirection: 'row',
      padding: Spacing.md,
    },
    textContainer: {
      flex: 1,
      gap: Spacing.sm,
    },
    icon: {
      marginRight: Spacing.md,
      // Aligns the icon and the first line of text vertically (assuming the icon is 24px and line height is 24)
      marginTop: 2,
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

  if (!showBanner) {
    return null
  }

  // If more details are needed we might need to push the banner down to accommodate the extra information
  return (
    <TouchableOpacity
      style={styles.container}
      testID={testIdWithKey(`${TestIds.shared.appBanner.buttonPrefix}${type}`)}
      accessibilityLabel={a11yLabel(title || description || '')}
      accessibilityRole="button"
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
        color={foreground}
        style={styles.icon}
        testID={testIdWithKey(`${TestIds.shared.appBanner.iconPrefix}${type}`)}
      />
      <View style={styles.textContainer}>
        {title ? (
          <ThemedText
            variant={'bold'}
            style={{ color: foreground }}
            testID={testIdWithKey(`${TestIds.shared.appBanner.textPrefix}${type}`)}
          >
            {title}
          </ThemedText>
        ) : null}
        {description ? (
          <ThemedText
            style={{ lineHeight: 24, color: foreground }}
            testID={testIdWithKey(`${TestIds.shared.appBanner.descriptionPrefix}${type}`)}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>
    </TouchableOpacity>
  )
}
