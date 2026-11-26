import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { CancellableWaitingScreen } from '../../components/CancellableWaitingScreen'

const CANCEL_DELAY_MS = 5000

type CallProcessingViewProps = {
  message: string
  onCancel: () => void | Promise<void>
}

const CallProcessingView = ({ message, onCancel }: CallProcessingViewProps) => (
  <CancellableWaitingScreen
    message={message}
    onCancel={onCancel}
    cancelTestID={testIdWithKey(TestIds.verify.liveCall.cancel)}
    cancelDelayMs={CANCEL_DELAY_MS} // reveal the cancel button after 5 seconds
  />
)

export default CallProcessingView
