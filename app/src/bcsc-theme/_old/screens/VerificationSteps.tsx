import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'

import VerificationStepsContent from '../contents/VerificationSteps/Steps'
import { BCScreens } from '../types/navigators'

const VerificationStepsScreen: React.FC = () => {
  const navigation = useNavigation()

  const goToEvidenceCollectionStep = useCallback(() => {
    navigation.navigate(BCScreens.EvidenceCollectionStep as never)
  }, [navigation])

  const goToResidentialAddressStep = useCallback(() => {
    navigation.navigate(BCScreens.ResidentialAddressStep as never)
  }, [navigation])

  const goToEmailStep = useCallback(() => {
    navigation.navigate(BCScreens.EmailStep as never)
  }, [navigation])

  const goToVerifyIdentityStep = useCallback(() => {
    navigation.navigate(BCScreens.VerifyIdentityStep as never)
  }, [navigation])

  return (
    <VerificationStepsContent
      goToEvidenceCollectionStep={goToEvidenceCollectionStep}
      goToResidentialAddressStep={goToResidentialAddressStep}
      goToEmailStep={goToEmailStep}
      goToVerifyIdentityStep={goToVerifyIdentityStep}
    />
  )
}

export default VerificationStepsScreen
