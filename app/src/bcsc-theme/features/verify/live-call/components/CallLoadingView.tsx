import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'
import { WAITING_SCREEN_CANCEL_DELAY_MS } from '@/bcsc-theme/features/verify/constants'
import { TestIds } from '@/test-ids/registry'
import { Button, ButtonType, testIdWithKey } from '@bifold/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

type CallLoadingViewProps = {
  onCancel: () => void
  message?: string
  progressPercent: number
}

const CallLoadingView = ({ onCancel, message, progressPercent }: CallLoadingViewProps) => {
  const { t } = useTranslation()
  const [delayReached, setDelayReached] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => setDelayReached(true), WAITING_SCREEN_CANCEL_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [])

  // Reserve space so revealing Cancel does not shift the waiting layout (#4513).
  const controls = (
    <View
      style={{ opacity: delayReached ? 1 : 0 }}
      pointerEvents={delayReached ? 'auto' : 'none'}
      accessibilityElementsHidden={!delayReached}
      importantForAccessibility={delayReached ? 'auto' : 'no-hide-descendants'}
    >
      <Button
        buttonType={ButtonType.Secondary}
        onPress={onCancel}
        disabled={!delayReached}
        title={t('Global.Cancel')}
        accessibilityLabel={t('Global.Cancel')}
        testID={testIdWithKey(TestIds.verify.liveCall.cancel)}
      />
    </View>
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
