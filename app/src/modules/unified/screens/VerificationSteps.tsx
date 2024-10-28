import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'

import { BCScreens } from '../../../types/navigators'
import VerificationStepsContent from '../contents/VerificationSteps/Steps'

const VerificationStepsScreen: React.FC = () => {
  const navigation = useNavigation()

  const goToStep1 = useCallback(() => {
    navigation.navigate(BCScreens.VerificationStep1 as never)
  }, [navigation])

  const goToStep2 = useCallback(() => {
    navigation.navigate(BCScreens.VerificationStep2 as never)
  }, [navigation])

  const goToStep3 = useCallback(() => {
    navigation.navigate(BCScreens.VerificationStep3 as never)
  }, [navigation])

  const goToStep4 = useCallback(() => {
    navigation.navigate(BCScreens.VerificationStep4 as never)
  }, [navigation])

  return (
    <VerificationStepsContent goToStep1={goToStep1} goToStep2={goToStep2} goToStep3={goToStep3} goToStep4={goToStep4} />
  )
}

export default VerificationStepsScreen
