import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCDispatchAction, BCState } from '@/store'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { registration } = useApi()

  const handleUpdateRegistration = async () => {
    await registration.updateRegistration(store.bcsc)
  }

  return (
    <StatusDetails
      title={t('Unified.Verification.Title')}
      description={t('Unified.Verification.Description')}
      extraText={t('Unified.Verification.ExtraText')}
      buttonText={t('Unified.Verification.ButtonText')}
      onButtonPress={() => {
        dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        dispatch({ type: BCDispatchAction.CLEAR_USER_METADATA })
        handleUpdateRegistration()
      }}
    />
  )
}
export default VerificationSuccessScreen
