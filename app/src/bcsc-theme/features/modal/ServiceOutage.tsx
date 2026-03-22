import { SystemModal } from './components/SystemModal'
import useServiceOutageViewModel from './useServiceOutageViewModel'

export const ServiceOutage = (): React.ReactElement => {
  const { headerText, contentText, buttonText, handleCheckAgain } = useServiceOutageViewModel()

  return (
    <SystemModal
      iconName="error-outline"
      headerText={headerText}
      contentText={contentText}
      buttonText={buttonText}
      onButtonPress={handleCheckAgain}
    />
  )
}
