import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCAnimatedLoadingIcon } from '@/bcsc-theme/features/splash-loading/BCAnimatedLoadingIcon'
import ProgressBar from '@/components/ProgressBar'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

type CallLoadingViewProps = {
  onCancel: () => void
  message?: string
}

const CallLoadingView = ({ onCancel, message }: CallLoadingViewProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const [progressPercent, setProgressPercent] = useState(0)
  const [delayReached, setDelayReached] = useState(false)

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

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        onPress={onCancel}
        title={t('Global.Cancel')}
        accessibilityLabel={t('Global.Cancel')}
        testID={testIdWithKey('Cancel')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top', 'bottom', 'left', 'right']} controls={controls}>
      <ProgressBar dark={true} progressPercent={progressPercent} />
      <View style={{ flex: 1, padding: Spacing.md }}>
        <ThemedText variant={'headingThree'} style={{ marginTop: 2 * Spacing.xxl, textAlign: 'center' }}>
          {t('BCSC.VideoCall.Loading.OneMomentPlease')}
        </ThemedText>
        <ThemedText style={{ marginTop: 2 * Spacing.xxl, textAlign: 'center' }}>
          {message || t('BCSC.VideoCall.Loading.SettingThingsUp')}
        </ThemedText>
        <View style={{ alignSelf: 'center', marginVertical: Spacing.md }}>
          <BCAnimatedLoadingIcon size={200} />
        </View>
        {delayReached ? (
          <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>
            {t('BCSC.VideoCall.Loading.TakingLongerThanUsual')}
          </ThemedText>
        ) : null}
      </View>
    </ScreenWrapper>
  )
}

export default CallLoadingView
