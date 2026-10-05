import ProgressBar from '@/components/ProgressBar'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { ReactNode, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCAnimatedLoadingIcon } from './BCAnimatedLoadingIcon'

export const WaitingScreenContent = ({
  message,
  statusMessage,
  supportingMessage,
  progressPercent,
  testIDKey = TestIds.shared.waitingScreen.key,
  controls,
  active = true,
}: {
  message: string
  statusMessage?: string
  supportingMessage?: string
  progressPercent?: number
  testIDKey?: string
  controls?: ReactNode
  active?: boolean
}) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [viewportHeight, setViewportHeight] = useState(0)
  const [loadingHeight, setLoadingHeight] = useState(0)
  const iconSize = 113
  const hasProgress = progressPercent !== undefined
  const status = statusMessage ?? t('Init.Starting')
  const isLayoutReady = viewportHeight > 0 && (!hasProgress || loadingHeight > 0)

  const handleViewportLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    if (nativeEvent.layout.height > 0) {
      setViewportHeight(nativeEvent.layout.height)
    }
  }, [])

  const handleLoadingLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    if (nativeEvent.layout.height > 0) {
      setLoadingHeight(nativeEvent.layout.height)
    }
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    content: {
      flexGrow: 1,
      paddingBottom: Spacing.sm,
    },
    viewport: {
      opacity: isLayoutReady ? 1 : 0,
    },
    header: {
      gap: Spacing.sm,
    },
    loading: {
      gap: 2,
    },
    track: {
      overflow: 'hidden',
    },
    status: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: 6,
      textAlign: 'center',
      lineHeight: 21,
    },
    headingContainer: {
      minHeight: Math.max(
        0,
        // Keeps the icon vertically centered after accounting for the progress row above it.
        (viewportHeight - iconSize) / 2 - (hasProgress ? loadingHeight + Spacing.sm : 0) - Spacing.sm
      ),
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
    },
    heading: {
      textAlign: 'center',
      color: ColorPalette.brand.primary,
      fontSize: 24,
      lineHeight: 36,
    },
    illustration: {
      marginTop: Spacing.sm,
      alignItems: 'center',
    },
    supportingMessage: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      textAlign: 'center',
    },
    controls: {
      marginTop: 'auto',
      padding: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container} testID={testIdWithKey(testIDKey)}>
      <ScrollView
        style={styles.viewport}
        contentContainerStyle={styles.content}
        testID={testIdWithKey(`${testIDKey}${TestIds.shared.waitingScreen.viewportSuffix}`)}
        onLayout={handleViewportLayout}
      >
        <View style={styles.header}>
          {hasProgress && (
            <View
              style={styles.loading}
              testID={testIdWithKey(`${testIDKey}${TestIds.shared.waitingScreen.statusSuffix}`)}
              onLayout={handleLoadingLayout}
            >
              <View
                style={styles.track}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={status}
                accessibilityState={{ busy: true }}
                accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
              >
                <ProgressBar
                  progressPercent={progressPercent}
                  height={8} // As specified in Figma.
                  trackColor={ColorPalette.grayscale.veryLightGrey}
                  progressColor={ColorPalette.brand.highlight}
                />
              </View>
              <ThemedText variant="caption" style={styles.status}>
                {status}
              </ThemedText>
            </View>
          )}
          <View style={styles.headingContainer}>
            <ThemedText variant="headingThree" style={styles.heading}>
              {message}
            </ThemedText>
          </View>
        </View>
        <View style={styles.illustration} accessible={false} importantForAccessibility="no-hide-descendants">
          <BCAnimatedLoadingIcon size={iconSize} active={active} />
        </View>
        {supportingMessage ? (
          <ThemedText variant="labelSubtitle" style={styles.supportingMessage}>
            {supportingMessage}
          </ThemedText>
        ) : null}
        {controls ? <View style={styles.controls}>{controls}</View> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
