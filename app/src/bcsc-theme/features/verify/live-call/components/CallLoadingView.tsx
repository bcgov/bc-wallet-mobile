import ProgressBar from '@/components/ProgressBar'
import Mountains from '@assets/img/mountains-circle.svg'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type CallLoadingViewProps = {
  onCancel: () => void
  message?: string
}

const CallLoadingView = ({ onCancel, message }: CallLoadingViewProps) => {
  const { Spacing, ColorPalette } = useTheme()
  const { t } = useTranslation()
  const [progressPercent, setProgressPercent] = useState(0)
  const [delayReached, setDelayReached] = useState(false)

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    upperContainer: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      padding: Spacing.md,
    },
    controlsContainer: {
      marginTop: 'auto',
      padding: Spacing.md,
    },
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev > 90) {
          setDelayReached(true)
        }

        // Logarithmic progression - slows down as it approaches 100%
        const maxProgress = 97

        if (prev >= maxProgress) {
          return prev
        }

        const increment = (maxProgress - prev) * 0.02

        return Math.min(prev + increment, maxProgress)
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.upperContainer}>
        <ProgressBar dark={true} progressPercent={progressPercent} />
        <View style={styles.contentContainer}>
          <ThemedText variant={'headingTwo'} style={{ marginTop: 2 * Spacing.xxl, textAlign: 'center' }}>
            {t('Unified.VideoCall.OneMomentPlease')}
          </ThemedText>
          <ThemedText style={{ marginTop: 2 * Spacing.xxl, textAlign: 'center' }}>
            {message || t('Unified.VideoCall.SettingThingsUp')}
          </ThemedText>
          <Mountains style={{ alignSelf: 'center', marginVertical: Spacing.md }} height={200} width={200} />
          {delayReached ? (
            <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>
              {t('Unified.VideoCall.TakingLongerThanUsual')}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.controlsContainer}>
        <Button
          buttonType={ButtonType.Primary}
          onPress={onCancel}
          title={t('Global.Cancel')}
          accessibilityLabel={t('Global.Cancel')}
          testID={testIdWithKey('Cancel')}
        />
      </View>
    </SafeAreaView>
  )
}

export default CallLoadingView
