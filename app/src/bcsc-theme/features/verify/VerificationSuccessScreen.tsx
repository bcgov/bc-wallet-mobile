import StatusDetails from '@/bcsc-theme/components/StatusDetails'
import { BCDispatchAction, BCState } from '@/store'
import { useStore } from '@bifold/core'

const VerificationSuccessScreen = () => {
  const [, dispatch] = useStore<BCState>()

  return (
    <StatusDetails
      title={`You're all set`}
      description={`Use this app to securely log in to many different websites.`}
      extraText={`Remember, it is not a health card, vaccine card, driver's license, or photo ID.`}
      buttonText={'Ok'}
      onButtonPress={() => {
        dispatch({ type: BCDispatchAction.UPDATE_VERIFIED, payload: [true] })
        dispatch({ type: BCDispatchAction.CLEAR_USER_METADATA })
      }}
    />
  )
}
export default VerificationSuccessScreen
