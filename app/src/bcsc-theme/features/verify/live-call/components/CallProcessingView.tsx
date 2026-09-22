import { WaitingScreenContent } from '@/bcsc-theme/components/WaitingScreenContent'

type CallProcessingViewProps = {
  message: string
}

const CallProcessingView = ({ message }: CallProcessingViewProps) => <WaitingScreenContent message={message} />

export default CallProcessingView
