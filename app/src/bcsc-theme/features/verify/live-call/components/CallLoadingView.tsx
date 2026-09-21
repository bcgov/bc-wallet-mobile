import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, testIdWithKey } from '@bifold/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type CallLoadingViewProps = {
  onCancel: () => void
  message?: string
}

const CallLoadingView = ({ onCancel, message }: CallLoadingViewProps) => {
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
    <Button
      buttonType={ButtonType.Secondary}
      onPress={onCancel}
      title={t('Global.Cancel')}
      accessibilityLabel={t('Global.Cancel')}
      testID={testIdWithKey(TestIds.verify.liveCall.cancel)}
    />
  )

  return (
    <WaitingScreenContent
      message={t('BCSC.VideoCall.Loading.OneMomentPlease')}
      statusMessage={message || t('BCSC.VideoCall.Loading.SettingThingsUp')}
      supportingMessage={delayReached ? t('BCSC.VideoCall.Loading.TakingLongerThanUsual') : undefined}
      progressPercent={progressPercent}
      controls={controls}
    />
  )
}

export default CallLoadingView
