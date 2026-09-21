import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, testIdWithKey } from '@bifold/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Preserve the existing warning delay independently of workflow progress.
const LONG_WAIT_DELAY_MS = 13200

type CallLoadingViewProps = {
  onCancel: () => void
  message?: string
  progressPercent: number
}

const CallLoadingView = ({ onCancel, message, progressPercent }: CallLoadingViewProps) => {
  const { t } = useTranslation()
  const [delayReached, setDelayReached] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDelayReached(true), LONG_WAIT_DELAY_MS)
    return () => clearTimeout(timeout)
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
