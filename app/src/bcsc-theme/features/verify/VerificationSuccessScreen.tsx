import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const [, dispatch] = useStore<BCState>()

  return (
    <StatusDetails
      title={t('Unified.Verification.Title')}
      description={t('Unified.Verification.Description')}
      extraText={t('Unified.Verification.ExtraText')}
      buttonText={t('Unified.Verification.ButtonText')}
      onButtonPress={() => {
        dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        dispatch({ type: BCDispatchAction.CLEAR_USER_METADATA })
      }}
    />
  )
}
export default VerificationSuccessScreen
