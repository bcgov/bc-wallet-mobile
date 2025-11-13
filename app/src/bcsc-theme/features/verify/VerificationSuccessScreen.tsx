import useApi from '@/bcsc-theme/api/hooks/useApi'
import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCDispatchAction, BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import { useTranslation } from 'react-i18next'

const VerificationSuccessScreen = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { registration } = useApi()

  const handleUpdateRegistration = async () => {
    try {
      await registration.updateRegistration(store.bcsc.registrationAccessToken, store.bcsc.selectedNickname)
    } catch (error) {
      logger.error('Failed to update registration', { error })
      return
    }
  }

  return (
    <StatusDetails
      title={t('BCSC.Verification.Title')}
      description={t('BCSC.Verification.Description')}
      extraText={t('BCSC.Verification.ExtraText')}
      buttonText={t('BCSC.Verification.ButtonText')}
      onButtonPress={() => {
        dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        dispatch({ type: BCDispatchAction.CLEAR_USER_METADATA })
        handleUpdateRegistration()
      }}
    />
  )
}
export default VerificationSuccessScreen
