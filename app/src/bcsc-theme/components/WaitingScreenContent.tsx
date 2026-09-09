import ProgressBar from '@/components/ProgressBar'
import { TestIds } from '@/test-ids/registry'
import { AppColorPalette, LightWaitingScreenColors } from '@/theme/waiting-screen'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCAnimatedLoadingIcon } from './BCAnimatedLoadingIcon'

export const WaitingScreenContent = ({
  message,
  statusMessage,
  progressPercent,
  testID,
  controls,
  active = true,
}: {
  message: string
  statusMessage?: string
  progressPercent?: number
  testID?: string
  controls?: ReactNode
  active?: boolean
}) => {
  const { ColorPalette, Spacing } = useTheme()
  const colors = (ColorPalette as AppColorPalette).waitingScreen ?? LightWaitingScreenColors
  const { t } = useTranslation()
  const [viewportHeight, setViewportHeight] = useState(0)
  const [loadingHeight, setLoadingHeight] = useState(0)
  const iconSize = 113
  const hasProgress = progressPercent !== undefined
  const status = statusMessage ?? t('Init.Starting')
  const isLayoutReady = viewportHeight > 0 && (!hasProgress || loadingHeight > 0)

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
      color: colors.status,
    },
    headingContainer: {
      minHeight: Math.max(
        0,
        (viewportHeight - iconSize) / 2 - (hasProgress ? loadingHeight + Spacing.sm : 0) - Spacing.sm
      ),
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
    },
    heading: {
      textAlign: 'center',
      color: colors.heading,
      fontSize: 24,
      lineHeight: 36,
    },
    illustration: {
      marginTop: Spacing.sm,
      alignItems: 'center',
    },
    controls: {
      marginTop: 'auto',
      padding: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <ScrollView
        style={styles.viewport}
        contentContainerStyle={styles.content}
        testID={testIdWithKey(TestIds.common.waitingScreenViewport)}
        onLayout={({ nativeEvent }) => {
          if (nativeEvent.layout.height > 0) {
            setViewportHeight(nativeEvent.layout.height)
          }
        }}
      >
        <View style={styles.header}>
          {hasProgress && (
            <View
              style={styles.loading}
              testID={testIdWithKey(TestIds.common.waitingScreenStatus)}
              onLayout={({ nativeEvent }) => {
                if (nativeEvent.layout.height > 0) {
                  setLoadingHeight(nativeEvent.layout.height)
                }
              }}
            >
              <View
                style={styles.track}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={status}
                accessibilityState={{ busy: true }}
              >
                <ProgressBar
                  progressPercent={progressPercent}
                  trackColor={colors.track}
                  progressColor={colors.progress}
                  height={8}
                  active={active}
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
        {controls ? <View style={styles.controls}>{controls}</View> : null}
      </ScrollView>
    </SafeAreaView>
  )
}
