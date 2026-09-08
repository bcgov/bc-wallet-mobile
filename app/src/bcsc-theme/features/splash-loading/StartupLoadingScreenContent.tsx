import ProgressBar from '@/components/ProgressBar'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCAnimatedLoadingIcon } from './BCAnimatedLoadingIcon'

const STARTUP_LIGHT_COLORS = {
  heading: '#013366',
  status: '#474543',
  track: '#FAF9F8',
  progress: '#F8BA47',
}

const STARTUP_PROGRESS_PERCENT = (2 / 3) * 100

export const StartupLoadingScreenContent = ({
  message,
  statusMessage,
}: {
  message?: string
  statusMessage?: string
}) => {
  const { t } = useTranslation()
  const { ColorPalette, NavigationTheme, Spacing, TextTheme } = useTheme()
  const [viewportHeight, setViewportHeight] = useState(0)
  const [loadingHeight, setLoadingHeight] = useState(0)
  const iconSize = 113
  const isLayoutReady = viewportHeight > 0 && loadingHeight > 0

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
      minHeight: 43,
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
      color: NavigationTheme.dark ? TextTheme.caption.color : STARTUP_LIGHT_COLORS.status,
    },
    headingContainer: {
      minHeight: Math.max(0, (viewportHeight - iconSize) / 2 - loadingHeight - 2 * Spacing.sm),
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
    },
    heading: {
      textAlign: 'center',
      color: NavigationTheme.dark ? ColorPalette.brand.primary : STARTUP_LIGHT_COLORS.heading,
      fontSize: 24,
      lineHeight: 36,
    },
    illustration: {
      marginTop: Spacing.sm,
      alignItems: 'center',
    },
  })

  return (
    <SafeAreaView style={styles.container} testID={testIdWithKey('StartupLoadingScreenContent')}>
      <ScrollView
        style={styles.viewport}
        contentContainerStyle={styles.content}
        testID={testIdWithKey('StartupLoadingScreenContentViewport')}
        onLayout={({ nativeEvent }) => {
          if (nativeEvent.layout.height > 0) {
            setViewportHeight(nativeEvent.layout.height)
          }
        }}
      >
        <View style={styles.header}>
          <View
            style={styles.loading}
            testID={testIdWithKey('StartupLoadingScreenContentStatus')}
            onLayout={({ nativeEvent }) => {
              if (nativeEvent.layout.height > 0) {
                setLoadingHeight(nativeEvent.layout.height)
              }
            }}
          >
            <View
              style={styles.track}
              accessibilityRole="progressbar"
              accessibilityLabel={statusMessage ?? t('Init.Starting')}
              accessibilityState={{ busy: true }}
            >
              <ProgressBar
                progressPercent={STARTUP_PROGRESS_PERCENT}
                trackColor={NavigationTheme.dark ? ColorPalette.grayscale.veryLightGrey : STARTUP_LIGHT_COLORS.track}
                progressColor={NavigationTheme.dark ? ColorPalette.brand.highlight : STARTUP_LIGHT_COLORS.progress}
              />
            </View>
            <ThemedText variant="caption" style={styles.status}>
              {statusMessage ?? t('Init.Starting')}
            </ThemedText>
          </View>
          <View style={styles.headingContainer}>
            <ThemedText variant="headingThree" style={styles.heading}>
              {message ?? t('BCSC.Loading.AppStartup')}
            </ThemedText>
          </View>
        </View>
        <View style={styles.illustration} accessible={false} importantForAccessibility="no-hide-descendants">
          <BCAnimatedLoadingIcon size={iconSize} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
