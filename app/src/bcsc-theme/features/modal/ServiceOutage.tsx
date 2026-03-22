import { SystemModal } from './components/SystemModal'
import useServiceOutageViewModel from './useServiceOutageViewModel'

export const ServiceOutage = (): React.ReactElement => {
  const { headerText, contentText, buttonText, isChecking, handleCheckAgain } = useServiceOutageViewModel()

  return (
    <SystemModal
      iconName="error-outline"
      headerText={headerText}
      contentText={contentText}
      buttonText={buttonText}
      buttonDisabled={isChecking}
      onButtonPress={handleCheckAgain}
    />
  )
}
