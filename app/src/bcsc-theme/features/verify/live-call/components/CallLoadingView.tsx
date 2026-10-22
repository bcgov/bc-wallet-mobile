import { CancellableWaitingScreen } from '@/bcsc-theme/features/verify/components/CancellableWaitingScreen'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { useTranslation } from 'react-i18next'

type CallLoadingViewProps = {
  onCancel: () => void | Promise<void>
  message?: string
  progressPercent: number
}

const CallLoadingView = ({ onCancel, message, progressPercent }: CallLoadingViewProps) => {
  const { t } = useTranslation()

  return (
    <CancellableWaitingScreen
      testIDKey={TestIds.verify.liveCall.loadingScreen}
      message={t('BCSC.VideoCall.Loading.OneMomentPlease')}
      statusMessage={message || t('BCSC.VideoCall.Loading.SettingThingsUp')}
      delayedMessage={t('BCSC.VideoCall.Loading.TakingLongerThanUsual')}
      progressPercent={progressPercent}
      onCancel={onCancel}
      cancelTestID={testIdWithKey(TestIds.verify.liveCall.cancel)}
    />
  )
}

export default CallLoadingView
